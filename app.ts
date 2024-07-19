
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createGenericFile, createSignerFromKeypair, generateSigner, keypairIdentity, percentAmount, sol } from '@metaplex-foundation/umi';
import { mockStorage } from '@metaplex-foundation/umi-storage-mock';
import * as fs from 'fs';
import secret from './wallet.json';


const QUICKNODE_RPC = 'https://api.devnet.solana.com';
const umi = createUmi(QUICKNODE_RPC);

const creatorWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
const creator = createSignerFromKeypair(umi, creatorWallet);
umi.use(keypairIdentity(creator));
umi.use(mplTokenMetadata());
umi.use(mockStorage());


const nftDetail = {
    name: "Alyra Solana Certificate",
    symbol: "AL",
    uri: "IPFS_URL_OF_METADATA", // ##TODO but not necessary as we use Umi to mock IPFS
    royalties: 0,
    description: 'First diplome with certi-sol',
    imgType: 'image/png',
    attributes: [
        { trait_type: 'organisme', value: 'Alyra' },  // ##TODO @Saad  to make dynamic after createCertificate onchain
        { trait_type: 'membre', value: 'Florian' },  // ##TODO  @Saad to make dynamic after createCertificate onchain
    ]
};


async function mintNft(metadataUri: string) {
    try {
        const mint = generateSigner(umi);
        await createNft(umi, {
            mint,
            name: nftDetail.name,
            symbol: nftDetail.symbol,
            uri: metadataUri,
            sellerFeeBasisPoints: percentAmount(nftDetail.royalties),
            creators: [{ address: creator.publicKey, verified: true, share: 100 }],
        }).sendAndConfirm(umi)
        console.log(`Created certi-sol certificate : ${mint.publicKey.toString()}`)
    } catch (e) {
        throw e;
    }
}



async function uploadCertificate(): Promise<string> {
    try {
        const imgDirectory = './uploads';
        const imgName = 'diplome.pdf'
        const filePath = `${imgDirectory}/${imgName}`;
        const fileBuffer = fs.readFileSync(filePath);
        const image = createGenericFile(
            fileBuffer,
            imgName,
            {
                uniqueName: nftDetail.name,
                contentType: nftDetail.imgType
            }
        );
        const [imgUri] = await umi.uploader.upload([image]);
        console.log('Uploaded diplome pdf :', imgUri);
        return imgUri;
    } catch (e) {
        throw e;
    }

}


async function uploadMetadata(imageUri: string): Promise<string> {
    try {
        const metadata = {
            name: nftDetail.name,
            description: nftDetail.description,
            image: imageUri,
            attributes: nftDetail.attributes,
            properties: {
                files: [
                    {
                        type: nftDetail.imgType,
                        uri: imageUri,
                    },
                ]
            }
        };
        const metadataUri = await umi.uploader.uploadJson(metadata);
        console.log('Uploaded metadata:', metadataUri);
        return metadataUri;
    } catch (e) {
        throw e;
    }
}


async function main() {
    const imageUri = await uploadCertificate();
    const metadataUri = await uploadMetadata(imageUri);
    await mintNft(metadataUri);
}

main();