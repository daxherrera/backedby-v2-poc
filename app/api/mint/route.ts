import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, mintV2, parseLeafFromMintV2Transaction } from '@metaplex-foundation/mpl-bubblegum';
import { keypairIdentity, publicKey, some } from '@metaplex-foundation/umi';
import pinataSDK from '@pinata/sdk';
import { base58 } from '@metaplex-foundation/umi/serializers';

export async function POST(request: NextRequest) {
    try {
        const {
            walletAddress,
            expires,
            durationMonths,
            name,
            projectName,
            projectDescription,
            projectImage,
            tierName,
            price,
            signedMessage
        } = await request.json();

        // Verify the signed message
        if (!signedMessage) {
            return NextResponse.json({ error: 'Signed message required' }, { status: 400 });
        }

        const { message, signature, timestamp } = signedMessage;

        // Check timestamp isn't too old (5 minutes)
        const messageAge = Date.now() - timestamp;
        if (messageAge > 5 * 60 * 1000) {
            return NextResponse.json({ error: 'Signature expired, please try again' }, { status: 400 });
        }

        // Verify signature
        const publicKey = new PublicKey(walletAddress);
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = Buffer.from(signature, 'base64');

        const isValid = nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKey.toBytes()
        );

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const description = projectName + ' ' + tierName + ' - backed.by';
        const nameTrimmed = (projectName + ' ' + tierName).slice(0, 32);


        if (!process.env.SOLANA_RPC_URL || !process.env.SOLANA_PRIVATE_KEY) {
            throw new Error('Solana configuration missing');
        }

        // Initialize Umi with Solana connection
        const umi = createUmi(process.env.SOLANA_RPC_URL);

        // Create keypair from private key 
        const secretKey = JSON.parse(process.env.SOLANA_PRIVATE_KEY as string);
        const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));

        umi.use(keypairIdentity(keypair));
        umi.use(mplBubblegum());

        // Get addresses from env
        const merkleTree = publicKey(process.env.MERKLE_TREE || '');
        const coreCollection = publicKey(process.env.COLLECTION_MINT || '');

        // Upload metadata to Pinata
        let metadataUri = 'https://gateway.pinata.cloud/ipfs/QmPZFkpLFrjKkgXqJGkgoiRSCJVRQiRm9isvjNPUEacF8n'; // fallback

        if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_API_KEY) {
            const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY);

            const metadata = {
                name: nameTrimmed,
                description: description,
                image: projectImage || 'https://t4.ftcdn.net/jpg/01/40/37/27/360_F_140372778_t5pCMkpioaa3MDXvXy17S9yq1pdGI6V2.jpg',
                attributes: [
                    {
                        trait_type: 'expires',
                        value: Math.floor(new Date(expires).getTime() / 1000),
                        display_type: 'date'
                    },
                    {
                        trait_type: 'price',
                        value: price,
                        display_type: 'number'
                    },
                    {
                        trait_type: 'renews',
                        value: 'true'
                    },
                    {
                        trait_type: 'duration_months',
                        value: durationMonths,
                        display_type: 'number'
                    },
                    {
                        trait_type: 'project',
                        value: projectName || 'Unknown Project'
                    },
                    {
                        trait_type: 'tier',
                        value: tierName || 'Unknown Tier'
                    }
                ]
            };

            try {
                const result = await pinata.pinJSONToIPFS(metadata);
                metadataUri = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
                console.log('Metadata uploaded to Pinata:', metadataUri);
            } catch (pinataError) {
                console.warn('Pinata upload failed, using fallback:', pinataError);
            }
        }

        // Mint compressed NFT v2 (will be automatically frozen due to collection's PermanentFreezeDelegate)
        const mintBuilder = mintV2(umi, {
            collectionAuthority: umi.identity,
            leafOwner: publicKey(walletAddress),
            merkleTree: merkleTree,
            coreCollection: coreCollection,
            metadata: {
                name: nameTrimmed,
                uri: metadataUri,
                sellerFeeBasisPoints: 0,
                collection: some(coreCollection),
                creators: [],
            },
        });

        const { signature: mintSignature } = await mintBuilder.sendAndConfirm(umi, { send: { commitment: 'confirmed' } });

        // Convert signature to base58 string
        const signatureString = base58.deserialize(mintSignature)[0];

        // Try to parse the leaf/asset from the transaction
        let assetId = null;
        try {
            const leaf = await parseLeafFromMintV2Transaction(umi, mintSignature);
            assetId = leaf.id;
        } catch (parseError) {
            console.warn('Could not parse asset ID from transaction:', parseError);
        }

        return NextResponse.json({
            success: true,
            signature: signatureString,
            assetId: assetId,
            message: `Non-transferable CNFT minted with ${durationMonths} month expiration`,
            metadataUri
        });
    } catch (error) {
        console.error('Minting error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}