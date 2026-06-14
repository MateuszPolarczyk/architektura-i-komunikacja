from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Parking',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('address', models.CharField(max_length=300)),
                ('city', models.CharField(blank=True, max_length=120)),
                ('description', models.TextField(blank=True)),
                ('latitude', models.DecimalField(decimal_places=6, max_digits=9)),
                ('longitude', models.DecimalField(decimal_places=6, max_digits=9)),
                ('hourly_rate', models.DecimalField(decimal_places=2, default=0, help_text='Price per hour in PLN', max_digits=6)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name_plural': 'parkings',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='ParkingSpot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label', models.CharField(help_text='e.g. A-12', max_length=20)),
                ('spot_type', models.CharField(choices=[('standard', 'Standard'), ('disabled', 'Disabled'), ('electric', 'Electric (EV charger)')], default='standard', max_length=20)),
                ('is_active', models.BooleanField(default=True, help_text='Inactive spots cannot be reserved (e.g. maintenance).')),
                ('parking', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='spots', to='parking.parking')),
            ],
            options={
                'ordering': ['parking', 'label'],
                'unique_together': {('parking', 'label')},
            },
        ),
    ]
