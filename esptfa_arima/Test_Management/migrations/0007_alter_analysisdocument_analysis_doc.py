# Generated by Django 5.1.7 on 2025-03-29 18:08

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Test_Management', '0006_alter_analysisdocument_analysis_doc'),
    ]

    operations = [
        migrations.AlterField(
            model_name='analysisdocument',
            name='analysis_doc',
            field=models.FileField(upload_to='analysis_documents/'),
        ),
    ]
