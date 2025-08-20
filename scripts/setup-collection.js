import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, createTree } from '@metaplex-foundation/mpl-bubblegum';
import { generateSigner, keypairIdentity } from '@metaplex-foundation/umi';
import { mplCore, createCollection } from '@metaplex-foundation/mpl-core';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function setupCollectionAndTree() {
    // Load keypair from env
    const secretKey = JSON.parse(process.env.SOLANA_PRIVATE_KEY);

    // Initialize Umi
    const umi = createUmi(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));

    umi.use(keypairIdentity(keypair));
    umi.use(mplBubblegum());
    umi.use(mplCore());

    console.log('Creating Core collection...');

    // Create Core collection
    const collectionSigner = generateSigner(umi);
    await createCollection(umi, {
        collection: collectionSigner,
        name: 'Subscription Passes',
        uri: '', // Empty URI for now
    }).sendAndConfirm(umi);

    console.log('Collection mint:', collectionSigner.publicKey);

    console.log('Creating merkle tree...');

    // Create merkle tree for compressed NFTs
    const merkleTree = generateSigner(umi);
    const builder = await createTree(umi, {
        merkleTree,
        maxDepth: 14,
        maxBufferSize: 64,
    });

    await builder.sendAndConfirm(umi);

    console.log('Merkle tree:', merkleTree.publicKey);

    // Save to .env.local
    const envContent = `
COLLECTION_MINT=${collectionSigner.publicKey}
MERKLE_TREE=${merkleTree.publicKey}
`;

    fs.appendFileSync('.env.local', envContent);
    console.log('Added to .env.local');
}

setupCollectionAndTree().catch(console.error);
