const anchor = require("@project-serum/anchor");
const dotenv = require('dotenv');
const {
    Connection,
    clusterApiUrl,
    Keypair,
    PublicKey
} = require("@solana/web3.js");
const {ShdwDrive, ShadowFile} = require("@shadow-drive/sdk");
const cliProgress = require('cli-progress');
const fs = require('fs');
const { randomInt } = require("crypto");
dotenv.config();
const env = process.env;
const key = require(env.UPLOAD_KEYPAIR);
const url = env.RPC;
const metaAssetDir = "./meta_assets/"

 function modifyJson(fileName, filepath, shdwBase) {
    const comps = fileName.split('.');
    const data = fs.readFileSync(filepath);
    var json = JSON.parse(data);
    const mType = json.properties.files[0].type.split("/")[1];
    const fileSuffix = comps[0] + "." + mType;
    const mediaUri = shdwBase + fileSuffix;
    json.image = mediaUri;
    json.properties.files[0].uri = mediaUri;
    
    return json
 }

async function unpackEnv(drive) {
	const name = env.BASE_NAME;
	const symbol = env.SYMBOL;
	const supply = env.SUPPLY;
    let shdwKey = env.SHADOW_DRIVE;
    const size = env.STORAGE_SPACE;
    const collectionMedia = env.COLLECTION_MEDIA;
    const collectionJson = env.COLLECTION_JSON;
    const prerevealMedia = env.UNREVEAL_MEDIA;
    const prerevealJson = env.UNREVEAL_JSON;
    if (!shdwKey) {
        console.log("Creating new shadow drive");
        const nonce = randomInt(10000);
        const newAcct = await drive.createStorageAccount(name.toLowerCase() + "_nft_" + nonce, size, "v2")
        shdwKey = newAcct.shdw_bucket;
        console.log("New Shadow Bucket: ", shdwKey);
    }

    return {
        name,
        symbol,
        supply,
        shdwKey,
        collectionMedia,
        collectionJson,
        prerevealMedia,
        prerevealJson
    };
 }

async function validateFiles(supply) {
    const files = await fs.promises.readdir("./assets");

    // Extra check, if not uploading images this check will incorrectly fail
    const numFiles = files.length;
    if (numFiles !== supply * 2) {
        console.log(`ERROR UPLOADING: Config item value - ${supply} - should be half the number of files in ./assets - ${numFiles}`)
        return false;
    }

    return true;
 }

async function uploadCollectionData(drive, shdwKey, collectionJson, collectionMedia) {
    const collectionsAssets = [];
    const finalMetaAssets = [];
    const metaDir = "./collection_temp";
    if (fs.existsSync(metaDir)) {
        fs.rmSync(metaDir, { recursive: true, force: true });
    }
    fs.mkdirSync(metaDir);
	const shdwBase = "https://shdw-drive.genesysgo.net/" + shdwKey + "/";
    console.log("Uploading meta-collection assets");
    console.log("---- Collection ----");
    if (collectionMedia && collectionJson) {
        const collectionMediaPath = metaAssetDir + collectionMedia;
        const collectionJsonPath = metaAssetDir + collectionJson;
        const json = modifyJson(collectionJson, collectionJsonPath, shdwBase);
        fs.writeFileSync(metaDir + "/" + collectionJson, JSON.stringify(json, undefined, 1));
        const jsonFileData = fs.readFileSync(metaDir + "/" + collectionJson);
        const colJsonUpload = {
            name: collectionJson,
            file: jsonFileData
        }
        const mediaFileData = fs.readFileSync(collectionMediaPath);
        const colMediaUpload = {
            name: collectionMedia,
            file: mediaFileData
        }
        collectionsAssets.push(...[colJsonUpload, colMediaUpload]);
        finalMetaAssets.push({
            "collection": shdwBase + collectionJson
        });
        console.log("Generated Collection Metadata");
        await drive.uploadMultipleFiles(new PublicKey(shdwKey), collectionsAssets, 50);
        var metaUpload = JSON.stringify(finalMetaAssets, undefined, 1);
        fs.writeFile("./meta_assets.json", metaUpload, function(err, result) {
            if(err) console.log('error', err);

            console.log("Cleaning up temp files");
            fs.rmSync(metaDir, { recursive: true, force: true });

            console.log("Collection + Prereveal Upload Successful!");
        });
    } else {
        console.log("Missing collection data, no collection upload");
    }
}

async function uploadPrerevealData(drive, shdwKey, prerevealJson, prerevealMedia) {
    const metaAssetUploads = [];
    const finalMetaAssets = [];
    const metaDir = "./prereveal_temp";
    const shdwBase = "https://shdw-drive.genesysgo.net/" + shdwKey + "/";

    if (fs.existsSync(metaDir)) {
        fs.rmSync(metaDir, { recursive: true, force: true });
    }
    fs.mkdirSync(metaDir);
    if (prerevealJson && prerevealMedia) {
        console.log("---- Prereveal ----");
        const prerevealMediaPath = metaAssetDir + prerevealMedia;
        const prerevealJsonPath = metaAssetDir + prerevealJson;

        const json = modifyJson(prerevealJson, prerevealJsonPath, shdwBase);
        fs.writeFileSync(metaDir + "/" + prerevealJson, JSON.stringify(json, undefined, 1));
        const preJsonFileData = fs.readFileSync(metaDir + "/" + prerevealJson);
        const preJsonUpload = {
            name: prerevealJson,
            file: preJsonFileData
        }
        const preMediaFileData = fs.readFileSync(prerevealMediaPath);
        const preMediaUpload = {
            name: prerevealMedia,
            file: preMediaFileData
        }
        metaAssetUploads.push(...[preJsonUpload, preMediaUpload]);
        finalMetaAssets.push({
            "prereveal": shdwBase + prerevealJson
        });
        console.log("Generated Prereveal Metadata");

        await drive.uploadMultipleFiles(new PublicKey(shdwKey), metaAssetUploads, 50);
        var metaUpload = JSON.stringify(finalMetaAssets, undefined, 1);
        fs.writeFile("./meta_assets.json", metaUpload, function(err, result) {
            if(err) console.log('error', err);

            console.log("Cleaning up temp files");
            fs.rmSync(metaDir, { recursive: true, force: true });

            console.log("Collection + Prereveal Upload Successful!");
        });
    } else {
        console.log("Missing prereveal data, no prereveal");
    }
}

async function uploadMetadata(drive, baseName, symbol, shdwKey) {
    const files = await fs.promises.readdir("./assets");
	const shdwBase = "https://shdw-drive.genesysgo.net/" + shdwKey + "/";

    // Extra check, if not uploading images this check will incorrectly fail
    const numFiles = files.length;
    const finalMetadata = [];
    const newDir = "./temp";
    if (fs.existsSync(newDir)) {
        fs.rmSync(newDir, { recursive: true, force: true });
    }
    fs.mkdirSync(newDir);
    console.log("Converting files to proper URIs");
    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    // start the progress bar with a total value of 200 and start value of 0
    bar.start(numFiles, 0, {
        speed: "N/A"
    });
    for (let i = 0; i < numFiles; i++) {
        const file = files[i];
        const comps = file.split(".");
        const fType = comps[1];
        const isJson = fType === "json";
        if (isJson) {
            const json = modifyJson(file, './assets/' + file, shdwBase);
            const finalItem = {
                uri: shdwBase + file,
                name: baseName + " #" + (parseInt(comps[0]) + 1),
                symbol: symbol
            };
            finalMetadata.push(finalItem);
            fs.writeFileSync(newDir + "/" + file, JSON.stringify(json, undefined, 1));
        } else {
            fs.copyFileSync("./assets/" + file, newDir + "/" + file)
        }
        bar.increment();
    }
    bar.stop();
    const tempFiles = await fs.promises.readdir(newDir);
    const newFiles = tempFiles.length;
    if (newFiles !== numFiles) {
        console.log(`ERROR CONVERTING: Modified Files - ${newFiles} - should be equal to the number of files in ./assets - ${numFiles}`)
        return;
    }
    var uploadFiles = [];
    for (let i = 0; i < newFiles; i++) {
        const file = tempFiles[i];
        const fileData = fs.readFileSync(newDir + "/" + file);
        const fileToUpload = {
            name: file,
            file: fileData
        }
        uploadFiles.push(fileToUpload);
    }
    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    console.log("Uploading to Shadow Drive");
    // start the progress bar with a total value of 200 and start value of 0
    bar1.start(uploadFiles.length, 0, {
        speed: "N/A"
    });
    await drive.uploadMultipleFiles(new PublicKey(shdwKey), uploadFiles, 50, (res) => {
        bar1.increment(res);
    });
    console.log("SHDW upload complete");
    bar1.stop();

    console.log("Writing to Elixir Metadata file");
    var finalUpload = JSON.stringify(finalMetadata, undefined, 1);
    fs.writeFile("./metadata.json", finalUpload, function(err, result) {
        if(err) console.log('error', err);

        console.log("Cleaning up temp files");
        fs.rmSync(newDir, { recursive: true, force: true });

        console.log("Full Upload Successful!");
    });
}

async function main() {
    let secretKey = Uint8Array.from(key)
    let keypair=Keypair.fromSecretKey(secretKey);
    const connection = new Connection(url, "confirmed")
    const wallet = new anchor.Wallet(keypair);
    const drive = await new ShdwDrive(connection, wallet).init();

    const {
        name,
        symbol,
        supply,
        shdwKey,
        collectionMedia,
        collectionJson,
        prerevealMedia,
        prerevealJson
    } = await unpackEnv(drive);
    
    const filesValid = await validateFiles(supply);

    if (!filesValid) return;
    
    await uploadCollectionData(drive, shdwKey, collectionJson, collectionMedia);
    await uploadPrerevealData(drive, shdwKey, prerevealJson, prerevealMedia);
    await uploadMetadata(drive, name, symbol, shdwKey);
    
}

main()