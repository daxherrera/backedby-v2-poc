'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  description: string;
  image: string;
  tiers: Tier[];
}

interface Tier {
  id: string;
  name: string;
  price: number;
  duration: number; // in months
}

const PROJECTS: Project[] = [
  {
    id: 'molar-radio',
    name: 'Molar Radio',
    description: 'The root of all dental comedy - where every joke has bite!',
    image: 'https://t4.ftcdn.net/jpg/01/40/37/27/360_F_140372778_t5pCMkpioaa3MDXvXy17S9yq1pdGI6V2.jpg',
    tiers: [
      { id: 'cavity-free', name: 'Cavity Free', price: 3, duration: 1 },
      { id: 'fluoride-friend', name: 'Fluoride Friend', price: 8, duration: 3 },
      { id: 'crown-jewel', name: 'Crown Jewel', price: 25, duration: 12 }
    ]
  },
  {
    id: 'flossophy',
    name: 'Flossophy',
    description: 'Deep thoughts between the teeth - philosophical discussions about oral care.',
    image: 'https://static.vecteezy.com/system/resources/previews/036/470/606/non_2x/cute-tooth-girl-character-in-cartoon-style-dental-personage-illustration-illustration-for-children-dentistry-happy-tooth-icon-vector.jpg',
    tiers: [
      { id: 'wisdom-seeker', name: 'Wisdom Seeker', price: 5, duration: 1 },
      { id: 'enamel-enlightened', name: 'Enamel Enlightened', price: 12, duration: 3 },
      { id: 'dental-sage', name: 'Dental Sage', price: 40, duration: 6 }
    ]
  },
  {
    id: 'incisor-insights',
    name: 'Incisor Insights',
    description: 'Cutting-edge dental news that gets straight to the point!',
    image: 'https://cdn.pixabay.com/photo/2016/09/14/20/50/tooth-1670434_640.png',
    tiers: [
      { id: 'baby-tooth', name: 'Baby Tooth', price: 4, duration: 1 },
      { id: 'permanent-resident', name: 'Permanent Resident', price: 10, duration: 3 },
      { id: 'gold-filling', name: 'Gold Filling', price: 35, duration: 12 }
    ]
  },
  {
    id: 'plaque-attack',
    name: 'Plaque Attack Podcast',
    description: 'Fighting gum disease one episode at a time - action-packed dental adventures!',
    image: 'https://t4.ftcdn.net/jpg/01/40/37/27/360_F_140372778_t5pCMkpioaa3MDXvXy17S9yq1pdGI6V2.jpg',
    tiers: [
      { id: 'brusher', name: 'Brusher Brigade', price: 6, duration: 1 },
      { id: 'floss-boss', name: 'Floss Boss', price: 15, duration: 3 },
      { id: 'tartar-terminator', name: 'Tartar Terminator', price: 50, duration: 12 }
    ]
  },
  {
    id: 'brace-yourself',
    name: 'Brace Yourself',
    description: 'Orthodontic humor that will straighten out your day!',
    image: 'https://static.vecteezy.com/system/resources/previews/036/470/606/non_2x/cute-tooth-girl-character-in-cartoon-style-dental-personage-illustration-illustration-for-children-dentistry-happy-tooth-icon-vector.jpg',
    tiers: [
      { id: 'retainer', name: 'Retainer', price: 7, duration: 1 },
      { id: 'wire-warrior', name: 'Wire Warrior', price: 18, duration: 6 },
      { id: 'invisalign-elite', name: 'Invisalign Elite', price: 45, duration: 12 }
    ]
  }
];

export default function Home() {
  const [minting, setMinting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project>(PROJECTS[0]);
  const [selectedTier, setSelectedTier] = useState<Tier>(PROJECTS[0].tiers[0]);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string; assetId?: string; signature?: string } | null>(null);
  const { publicKey, connected, signMessage } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleProjectChange = (projectId: string) => {
    const project = PROJECTS.find(p => p.id === projectId);
    if (project) {
      setSelectedProject(project);
      setSelectedTier(project.tiers[0]); // Reset to first tier of new project
    }
  };

  const handleMint = async () => {
    if (!connected || !publicKey || !signMessage) {
      setStatus({ type: 'error', message: 'Please connect your wallet' });
      return;
    }

    setMinting(true);
    setStatus({ type: 'info', message: 'Please sign the message to prove wallet ownership...' });

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + selectedTier.duration);

    const nftName = `${selectedProject.name}: ${selectedTier.name} - backed.by`;

    try {
      // Create a message to sign
      const timestamp = Date.now();
      const message = `Sign this message to mint your subscription NFT\nProject: ${selectedProject.name}\nTier: ${selectedTier.name}\nTimestamp: ${timestamp}`;
      const encodedMessage = new TextEncoder().encode(message);

      // Request signature from wallet
      const signature = await signMessage(encodedMessage);

      setStatus({ type: 'info', message: 'Minting...' });

      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          expires: expiresAt.toISOString(),
          durationMonths: selectedTier.duration,
          name: nftName,
          projectName: selectedProject.name,
          projectDescription: selectedProject.description,
          projectImage: selectedProject.image,
          tierName: selectedTier.name,
          price: selectedTier.price,
          signedMessage: {
            message,
            signature: Buffer.from(signature).toString('base64'),
            timestamp
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Minting failed');
      }

      setStatus({
        type: 'success',
        message: `Success! Non-transferable NFT minted with ${selectedTier.duration} month expiration.`,
        assetId: data.assetId,
        signature: data.signature
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('User rejected')) {
        setStatus({
          type: 'error',
          message: 'Signature cancelled. Please try again.'
        });
      } else {
        setStatus({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } finally {
      setMinting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Optional: Add a temporary "Copied!" feedback
    const prevStatus = status;
    setStatus({ ...prevStatus!, message: prevStatus!.message + ' (Copied!)' });
    setTimeout(() => setStatus(prevStatus), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
            Mint Subscription NFT
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Create a non-transferable subscription pass
          </p>
          <div className="mt-2 text-center">
            <Link
              href="/collection"
              className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 text-sm"
            >
              View Collection →
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          {mounted && (
            <div className="flex justify-center">
              <WalletMultiButton />
            </div>
          )}

          {mounted && connected && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Dental Podcast
                </label>
                <select
                  value={selectedProject.id}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  disabled={minting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {PROJECTS.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {selectedProject && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 italic">
                    {selectedProject.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Subscription Tier
                </label>
                <select
                  value={selectedTier.id}
                  onChange={(e) => {
                    const tier = selectedProject.tiers.find(t => t.id === e.target.value);
                    if (tier) setSelectedTier(tier);
                  }}
                  disabled={minting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedProject.tiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name} - ${tier.price}/mo ({tier.duration} {tier.duration === 1 ? 'month' : 'months'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-4">
                  <img
                    src={selectedProject.image}
                    alt={selectedProject.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedProject.name}: {selectedTier.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {selectedProject.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      ${selectedTier.price}/month • {selectedTier.duration} month{selectedTier.duration > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                All NFTs are permanently non-transferable (soulbound)
              </div>

              <button
                onClick={handleMint}
                disabled={minting || !connected}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {minting ? 'Minting...' : 'Mint Subscription NFT'}
              </button>
            </>
          )}

          {status && (
            <div className={`p-3 rounded-md text-sm ${status.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200'
              : status.type === 'error'
                ? 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200'
                : 'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}>
              <p>{status.message}</p>
              {status.assetId && (
                <div className="mt-2 text-xs flex items-center gap-1">
                  <span>Asset ID:</span>
                  <span className="font-mono break-all">{status.assetId}</span>
                  <button
                    onClick={() => copyToClipboard(status.assetId!)}
                    className="ml-1 p-1 hover:bg-black/10 rounded transition-colors"
                    title="Copy Asset ID"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              )}
              {status.signature && (
                <p className="mt-1 text-xs">
                  Signature: <span className="font-mono break-all">{status.signature}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div >
  );
}