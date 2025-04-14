# Generated by Django 5.1.7 on 2025-04-06 07:36

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Test_Management', '0017_predictedscore_predicted_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysisdocumentstatistic',
            name='mean_passing_threshold',
            field=models.FloatField(default=0),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='formativeassessmentscore',
            name='passing_threshold',
            field=models.FloatField(default=0),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='formativeassessmentstatistic',
            name='passing_threshold',
            field=models.FloatField(default=0),
            preserve_default=False,
        ),
    ]
