SHELL = /bin/bash
.SHELLFLAGS = -c

MY_UNIQUE_CLOUDFORMATION_TEMPLATES_BUCKET_NAME=hazard-tracker-photo-processor-saml
MY_AWS_USERFILES_S3_BUCKET_ARN=arn:aws:s3:::hazard-tracker-photo-uploads-dev
MY_DYNAMODB_PHOTOS_TABLE_ARN=arn:aws:dynamodb:ap-southeast-2:288547829232:table/Photo-kjdseko4fvcfxbp2krfxzvyglm-dev
REGION=ap-southeast-2

.ONESHELL:
makebucket:
	aws s3 mb s3://${MY_UNIQUE_CLOUDFORMATION_TEMPLATES_BUCKET_NAME} --region ${REGION}

.ONESHELL:
createfunction:
	sam package \
	--template-file template.yaml \
	--output-template-file packaged.yml \
	--s3-bucket ${MY_UNIQUE_CLOUDFORMATION_TEMPLATES_BUCKET_NAME}

	sam deploy \
	--template-file packaged.yml \
	--stack-name HazardTrackerPhotoAlbumsProcessorStack \
	--capabilities CAPABILITY_IAM \
	--region ${REGION} \
	--parameter-overrides \
	S3UserfilesBucketArn=${MY_AWS_USERFILES_S3_BUCKET_ARN} \
	DynamoDBPhotosTableArn=${MY_DYNAMODB_PHOTOS_TABLE_ARN}

.PHONY: createfunction makebucket
