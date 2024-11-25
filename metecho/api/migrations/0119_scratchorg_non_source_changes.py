# Generated by Django 4.0.6 on 2024-01-31 13:15

import django.core.serializers.json
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0118_project_deleted_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="scratchorg",
            name="non_source_changes",
            field=models.JSONField(
                blank=True,
                default=dict,
                encoder=django.core.serializers.json.DjangoJSONEncoder,
            ),
        ),
    ]
