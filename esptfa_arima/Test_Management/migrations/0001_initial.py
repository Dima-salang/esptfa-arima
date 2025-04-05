# Generated by Django 5.1.7 on 2025-03-27 08:23

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Section',
            fields=[
                ('section_id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('section_name', models.CharField(max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name='Student',
            fields=[
                ('student_id', models.CharField(max_length=20, primary_key=True, serialize=False, unique=True)),
                ('first_name', models.CharField(max_length=100)),
                ('last_name', models.CharField(max_length=100)),
                ('section_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='Test_Management.section')),
            ],
        ),
        migrations.CreateModel(
            name='PredictedScore',
            fields=[
                ('predicted_score_id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('score', models.FloatField()),
                ('date', models.DateField(auto_now_add=True)),
                ('formative_assessment_number', models.CharField(max_length=5)),
                ('student_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='Test_Management.student')),
            ],
        ),
        migrations.CreateModel(
            name='FormativeAssessmentScore',
            fields=[
                ('formative_assessment_score_id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('score', models.FloatField()),
                ('date', models.DateField(auto_now_add=True)),
                ('formative_assessment_number', models.CharField(max_length=5)),
                ('student_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='Test_Management.student')),
            ],
        ),
        migrations.CreateModel(
            name='Teacher',
            fields=[
                ('teacher_id', models.CharField(max_length=20, primary_key=True, serialize=False, unique=True)),
                ('first_name', models.CharField(max_length=100)),
                ('last_name', models.CharField(max_length=100)),
                ('user_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='AnalysisDocument',
            fields=[
                ('analysis_document_id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('analysis_doc_title', models.CharField(max_length=100)),
                ('upload_date', models.DateTimeField(auto_now_add=True)),
                ('analysis_doc', models.FileField(upload_to='analysis_documents/')),
                ('section_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='Test_Management.section')),
                ('teacher_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='Test_Management.teacher')),
            ],
        ),
    ]
