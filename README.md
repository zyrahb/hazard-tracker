# Hazard Tracker

Template using this tutorial 
https://amplify-workshop.go-aws.com/

Initialising commands
```
npx create-react-app hazard-tracker
cd hazard-tracker
npm install --save semantic-ui-react
amplify init
amplify add auth
amplify push
npm install --save aws-amplify aws-amplify-react
npm install --save react-router-dom
amplify add api
amplify push
amplify add storage
amplify push
npm install --save uuid
```

`npm start`

Notes
- have to manually add the s3 trigger to lambda for an existing bucket in SAM also aws cli lambda only supports kinesis/dynamoDB/SQS

