'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AssetAttribute {
    trait_type: string;
    value: string | number;
    display_type?: string;
}

interface Asset {
    id: string;
    content: {
        json_uri: string;
        metadata: {
            name: string;
            description: string;
            image: string;
            attributes: AssetAttribute[];
        };
    };
    ownership: {
        owner: string;
    };
}

export default function CollectionPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        fetchCollection();
    }, []);

    const fetchCollection = async () => {
        try {
            const response = await fetch('/api/collection');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch collection');
            }

            setAssets(data.assets || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatAttribute = (attr: AssetAttribute) => {
        if (attr.display_type === 'date' && typeof attr.value === 'number') {
            return formatDate(attr.value);
        }
        if (attr.display_type === 'number') {
            return attr.value.toString();
        }
        if (attr.trait_type === 'renews') {
            return attr.value === 'true' ? 'Yes' : 'No';
        }
        return attr.value.toString();
    };

    const getAttributeLabel = (traitType: string) => {
        const labels: { [key: string]: string } = {
            'expires': 'Expires',
            'price': 'Price ($)',
            'renews': 'Auto-Renews',
            'duration_months': 'Duration',
            'project': 'Project',
            'tier': 'Tier'
        };
        return labels[traitType] || traitType;
    };

    const copyToClipboard = (text: string, assetId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(assetId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Subscription Pass
                        </h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            Non-transferable subscription passes
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                    >
                        ← Back to Mint
                    </Link>
                </div>

                {loading && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Loading collection...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 dark:bg-red-900 p-4 rounded-md">
                        <p className="text-red-800 dark:text-red-200">Error: {error}</p>
                    </div>
                )}

                {!loading && !error && assets.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-600 dark:text-gray-400">No NFTs found in collection</p>
                    </div>
                )}

                {!loading && !error && assets.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {assets.map((asset) => (
                            <div
                                key={asset.id}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                            >
                                <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
                                    {asset.content?.metadata?.image ? (
                                        <img
                                            src={asset.content.metadata.image}
                                            alt={asset.content.metadata.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = 'https://via.placeholder.com/400x400?text=No+Image';
                                            }}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <span className="text-gray-400">No image</span>
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
                                        Soulbound
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                                        {asset.content?.metadata?.name || 'Unnamed'}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                        {asset.content?.metadata?.description || 'No description'}
                                    </p>

                                    {asset.content?.metadata?.attributes && asset.content.metadata.attributes.length > 0 && (
                                        <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                                            {asset.content.metadata.attributes.map((attr, index) => (
                                                <div
                                                    key={index}
                                                    className="flex justify-between items-center text-sm"
                                                >
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        {getAttributeLabel(attr.trait_type)}:
                                                    </span>
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {formatAttribute(attr)}
                                                        {attr.trait_type === 'duration_months' && (
                                                            <span className="ml-1 text-gray-500">
                                                                {attr.value === 1 ? 'month' : 'months'}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                            <span className="font-medium truncate" title={asset.id}>
                                                Asset ID: {asset.id ?
                                                    `${asset.id.slice(0, 8)}...${asset.id.slice(-8)}`
                                                    : 'Unknown'}
                                            </span>
                                            {asset.id && (
                                                <button
                                                    onClick={() => copyToClipboard(asset.id, asset.id)}
                                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                                    title="Copy Asset ID"
                                                >
                                                    {copiedId === asset.id ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={asset.ownership?.owner}>
                                            <span className="font-medium">Owner:</span> {asset.ownership?.owner ?
                                                `${asset.ownership.owner.slice(0, 4)}...${asset.ownership.owner.slice(-4)}`
                                                : 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
