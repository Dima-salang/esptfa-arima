# Generated by Django 5.1.7 on 2025-04-01 10:58

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Test_Management', '0011_analysisdocument_test_start_date'),
    ]

    operations = [
        migrations.CreateModel(
            name='TestTopic',
            fields=[
                ('topic_id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('topic_name', models.CharField(max_length=100, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name='TestTopicMapping',
            fields=[
                ('mapping_id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('test_number', models.CharField(max_length=5)),
                ('analysis_document', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='test_topics', to='Test_Management.analysisdocument')),
                ('topic', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='Test_Management.testtopic')),
            ],
            options={
                'unique_together': {('analysis_document', 'test_number')},
            },
        ),
    ]
