# Generated by Django 5.1.7 on 2025-04-07 05:17

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Test_Management', '0019_predictedscore_passing_threshold'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysisdocumentstatistic',
            name='heatmap',
            field=models.FileField(null=True, upload_to='heatmaps/'),
        ),
    ]
