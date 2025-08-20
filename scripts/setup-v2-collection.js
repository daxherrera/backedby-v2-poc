import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, createTreeV2 } from '@metaplex-foundation/mpl-bubblegum';
import { generateSigner, keypairIdentity } from '@metaplex-foundation/umi';
import { mplCore, createCollection } from '@metaplex-foundation/mpl-core';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function setupV2CollectionAndTree() {
    // Load keypair from env
    const secretKey = JSON.parse(process.env.SOLANA_PRIVATE_KEY);

    // Initialize Umi
    const umi = createUmi(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));

    umi.use(keypairIdentity(keypair));
    umi.use(mplBubblegum());
    umi.use(mplCore());

    // Check balance
    const balance = await umi.rpc.getBalance(umi.identity.publicKey);
    console.log('Wallet balance:', Number(balance.basisPoints) / 1e9, 'SOL');

    console.log('Creating Core collection...');

    // Create Core collection with BubblegumV2 and PermanentFreezeDelegate plugins
    const collectionSigner = generateSigner(umi);
    await createCollection(umi, {
        collection: collectionSigner,
        name: 'Subscription Passes V2',
        uri: 'https://arweave.net/placeholder',
        plugins: [
            {
                type: 'BubblegumV2'
            },
            {
                type: 'PermanentFreezeDelegate',
                frozen: true
            }
        ],
    }).sendAndConfirm(umi);

    console.log('Collection mint:', collectionSigner.publicKey);

    console.log('Creating merkle tree for V2...');

    // Create merkle tree with V2 schema using createTreeV2
    const merkleTree = generateSigner(umi);
    const builder = await createTreeV2(umi, {
        merkleTree,
        maxBufferSize: 8,
        maxDepth: 3,
    });

    await builder.sendAndConfirm(umi);

    console.log('Merkle tree (V2):', merkleTree.publicKey);

    // Save to .env.local
    const envContent = `
# V2 Collection and Tree (NEW SCHEMA)
COLLECTION_MINT=${collectionSigner.publicKey}
MERKLE_TREE=${merkleTree.publicKey}
`;

    fs.writeFileSync('.env.local.v2', envContent);
    console.log('Created .env.local.v2 with new addresses');
    console.log('Copy these to your .env.local file to use them');
}

setupV2CollectionAndTree().catch(console.error);