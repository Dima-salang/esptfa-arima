# Generated by Django 5.1.7 on 2025-04-07 09:12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Test_Management', '0020_analysisdocumentstatistic_heatmap'),
    ]

    operations = [
        migrations.AddField(
            model_name='formativeassessmentstatistic',
            name='max_score',
            field=models.FloatField(null=True),
        ),
    ]
