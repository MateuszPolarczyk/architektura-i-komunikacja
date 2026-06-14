from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from parking.models import Parking, ParkingSpot
from reservations.models import Reservation

User = get_user_model()

PARKINGS = [
    {
        "name": "Parking Rynek",
        "address": "Rynek 1",
        "city": "Wrocław",
        "description": "Centralny parking w samym sercu starego miasta.",
        "latitude": 51.110000,
        "longitude": 17.031000,
        "hourly_rate": 8.00,
        "spots": 12,
    },
    {
        "name": "Parking Dworzec Główny",
        "address": "Piłsudskiego 105",
        "city": "Wrocław",
        "description": "Wielopoziomowy parking przy dworcu głównym PKP.",
        "latitude": 51.098000,
        "longitude": 17.036000,
        "hourly_rate": 6.50,
        "spots": 20,
    },
    {
        "name": "Parking Sky Tower",
        "address": "Powstańców Śląskich 95",
        "city": "Wrocław",
        "description": "Parking podziemny przy galerii Sky Tower.",
        "latitude": 51.094000,
        "longitude": 17.020000,
        "hourly_rate": 7.00,
        "spots": 16,
    },
    {
        "name": "Parking Stadion",
        "address": "al. Śląska 1",
        "city": "Wrocław",
        "description": "Duży parking naziemny przy Tarczyński Arena.",
        "latitude": 51.141000,
        "longitude": 16.954000,
        "hourly_rate": 4.00,
        "spots": 24,
    },
]

class Command(BaseCommand):
    help = "Seed the database with demo parkings, spots, a demo user and reservations."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset", action="store_true", help="Delete existing data first."
        )

    def handle(self, *args, **options):
        if options["reset"]:
            Reservation.objects.all().delete()
            ParkingSpot.objects.all().delete()
            Parking.objects.all().delete()
            self.stdout.write(self.style.WARNING("Existing parking data cleared."))

        demo, created = User.objects.get_or_create(
            email="demo@parkingspot.dev",
            defaults={"first_name": "Demo", "last_name": "User"},
        )
        if created:
            demo.set_password("demo12345")
            demo.save()
            self.stdout.write(self.style.SUCCESS("Created demo user demo@parkingspot.dev / demo12345"))

        types = [
            ParkingSpot.SpotType.STANDARD,
            ParkingSpot.SpotType.ELECTRIC,
            ParkingSpot.SpotType.DISABLED,
        ]

        created_spots = []
        for data in PARKINGS:
            count = data.pop("spots")
            parking, _ = Parking.objects.get_or_create(
                name=data["name"], defaults=data
            )
            for i in range(1, count + 1):
                spot_type = (
                    ParkingSpot.SpotType.ELECTRIC if i % 7 == 0
                    else ParkingSpot.SpotType.DISABLED if i % 11 == 0
                    else ParkingSpot.SpotType.STANDARD
                )
                spot, made = ParkingSpot.objects.get_or_create(
                    parking=parking,
                    label=f"{chr(65 + (i - 1) // 8)}-{i:02d}",
                    defaults={"spot_type": spot_type},
                )
                if made:
                    created_spots.append(spot)

        if created_spots:
            now = timezone.now()
            Reservation.objects.get_or_create(
                user=demo,
                spot=created_spots[0],
                start_time=now + timedelta(hours=2),
                end_time=now + timedelta(hours=5),
                defaults={"status": Reservation.Status.CONFIRMED},
            )
            Reservation.objects.get_or_create(
                user=demo,
                spot=created_spots[1],
                start_time=now - timedelta(days=2, hours=3),
                end_time=now - timedelta(days=2),
                defaults={"status": Reservation.Status.CONFIRMED},
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed complete: {Parking.objects.count()} parkings, "
                f"{ParkingSpot.objects.count()} spots."
            )
        )
