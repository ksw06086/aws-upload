const sharp = require('sharp'); // 이미지 리사이징 라이브러리
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

// 액세스키 따로 안넣는 건 람다가 실행되면 알아서 키를 넣어주어서
const s3 = new S3Client(); 

exports.handler = async (event, context, callback) => {
    const Bucket = event.Records[0].s3.bucket.name;
    const Key = decodeURIComponent(event.Records[0].s3.object.key); // original/고양이.png
    const filename = Key.split('/').at(-1); 
    const ext = Key.split('.').at(-1).toLowerCase();
    const requiredFormat = ext === 'jpg'?'jpeg':ext;
    console.log('name', filename, 'ext', ext);

    try {
        const getObject = await s3.send(new GetObjectCommand({ Bucket, Key }));
        // 스트림을 버퍼로 변경
        const buffers = [];
        for await (const data of getObject.Body){
            buffers.push(data);
        }
        const imageBuffer = Buffer.concat(buffers);
        console.log('original', imageBuffer.length);
        const resizedImage = await sharp(imageBuffer)
                .resize(200, 200, { fit: 'inside' })
                .toFormat(requiredFormat)
                .toBuffer();
        await s3.send(new PutObjectCommand({
            Bucket,
            Key: `thunb/${filename}`, // thunb/고양이.png
            Body: resizedImage,
        }));
        console.log('put', resizedImage.length);
        return callback(null, `thunb/${filename}`); // passport의 done의 cb(callback) 생각하면 됨
    } catch (error) {
        console.error(error);
        return callback(error);
    }
}