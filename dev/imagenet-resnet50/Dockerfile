FROM public.ecr.aws/lambda/python:3.12
RUN pip install numpy boto3 pillow tensorflow
COPY resnet50_model.h5 /var/task/resnet50_model.h5
COPY lambda_function.py /var/task/lambda_function.py
CMD ["lambda_function.lambda_handler"]