# Generated by Django 5.1.7 on 2025-04-07 15:24

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Test_Management', '0022_formativeassessmentstatistic_boxplot_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='formativeassessmentstatistic',
            name='bar_chart',
            field=models.FileField(null=True, upload_to='bar_charts/'),
        ),
    ]
