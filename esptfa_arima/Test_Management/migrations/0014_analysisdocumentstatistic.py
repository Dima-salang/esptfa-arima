# Generated by Django 5.1.7 on 2025-04-04 17:23

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Test_Management', '0013_alter_testtopic_topic_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='AnalysisDocumentStatistic',
            fields=[
                ('analysis_document_statistic_id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('mean', models.FloatField()),
                ('standard_deviation', models.FloatField()),
                ('median', models.FloatField()),
                ('minimum', models.FloatField()),
                ('maximum', models.FloatField()),
                ('mode', models.FloatField()),
                ('passing_rate', models.FloatField()),
                ('failing_rate', models.FloatField()),
                ('total_students', models.IntegerField()),
                ('analysis_document', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='Test_Management.analysisdocument')),
            ],
        ),
    ]
