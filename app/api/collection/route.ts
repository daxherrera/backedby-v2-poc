import { NextRequest, NextResponse } from 'next/server';

interface DASAsset {
    id: string;
    content?: {
        json_uri?: string;
        metadata?: {
            name?: string;
            description?: string;
            image?: string;
            attributes?: Array<{
                trait_type: string;
                value: string | number;
                display_type?: string;
            }>;
        };
        links?: {
            image?: string;
        };
    };
    ownership?: {
        owner?: string;
    };
    authorities?: string[];
}

export async function GET(request: NextRequest) {
    try {
        const collectionMint = process.env.COLLECTION_MINT;
        if (!collectionMint) {
            throw new Error('Collection mint not configured');
        }

        const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

        // Use DAS API to get assets by group (collection)
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'get-assets-by-group',
                method: 'getAssetsByGroup',
                params: {
                    groupKey: 'collection',
                    groupValue: collectionMint,
                    page: 1,
                    limit: 100,
                },
            }),
        });

        const data = await response.json();
        console.log('Fetched assets:', data);

        if (data.error) {
            throw new Error(data.error.message || 'Failed to fetch assets');
        }

        // Process assets and fetch metadata from URI if needed
        const assets = await Promise.all((data.result?.items || []).map(async (asset: DASAsset) => {
            let metadata = asset.content?.metadata;

            // If metadata is incomplete but we have a json_uri, fetch it
            if (asset.content?.json_uri && (!metadata?.name || !metadata?.description || !metadata?.image)) {
                try {
                    const metadataResponse = await fetch(asset.content.json_uri);
                    if (metadataResponse.ok) {
                        const fetchedMetadata = await metadataResponse.json();
                        metadata = {
                            name: fetchedMetadata.name || metadata?.name || 'Unknown',
                            description: fetchedMetadata.description || metadata?.description || '',
                            image: fetchedMetadata.image || metadata?.image || '',
                            attributes: fetchedMetadata.attributes || metadata?.attributes || []
                        };
                    }
                } catch (error) {
                    console.warn('Failed to fetch metadata from URI:', asset.content.json_uri, error);
                }
            }

            return {
                id: asset.id,
                content: {
                    json_uri: asset.content?.json_uri || '',
                    metadata: {
                        name: metadata?.name || 'Unknown',
                        description: metadata?.description || '',
                        image: metadata?.image || asset.content?.links?.image || '',
                        attributes: metadata?.attributes || []
                    }
                },
                ownership: {
                    owner: asset.ownership?.owner || asset.authorities?.[0] || 'Unknown'
                }
            };
        }));

        return NextResponse.json({
            success: true,
            assets,
            total: data.result?.total || 0,
        });
    } catch (error) {
        console.error('Error fetching collection:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
