from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('parking', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Reservation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_time', models.DateTimeField()),
                ('end_time', models.DateTimeField()),
                ('status', models.CharField(choices=[('confirmed', 'Confirmed'), ('cancelled', 'Cancelled')], default='confirmed', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('spot', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reservations', to='parking.parkingspot')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reservations', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-start_time'],
                'indexes': [models.Index(fields=['spot', 'status', 'start_time', 'end_time'], name='reservation_spot_id_08f9e0_idx')],
            },
        ),
    ]
