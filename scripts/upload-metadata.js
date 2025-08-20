import pinataSDK from '@pinata/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function uploadMetadata(name, description, durationMonths, expiresDate) {
    const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY);

    const metadata = {
        name: name + '- backed.by',
        description: description,
        image: 'https://t4.ftcdn.net/jpg/01/40/37/27/360_F_140372778_t5pCMkpioaa3MDXvXy17S9yq1pdGI6V2.jpg',
        attributes: [
            {
                trait_type: 'expires',
                value: Math.floor(new Date(expiresDate).getTime() / 1000),
                display_type: 'date'
            },
            {
                trait_type: 'price',
                value: 5,
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
            }
        ]
    };

    const result = await pinata.pinJSONToIPFS(metadata);
    console.log('Metadata uploaded:', `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`);
    return result.IpfsHash;
}

// Example usage
uploadMetadata('Great Content $5 - backed.by', 1, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
    .catch(console.error);
