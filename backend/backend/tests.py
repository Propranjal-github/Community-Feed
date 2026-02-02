from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from .models import KarmaTransaction
from django.urls import reverse
from rest_framework.test import APIClient

class LeaderboardLogicTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='password')

    def test_leaderboard_rolling_window(self):
        now = timezone.now()
        
        t1 = KarmaTransaction.objects.create(user=self.user, amount=50, source_type='POST', source_id='1')
        
        t2 = KarmaTransaction.objects.create(user=self.user, amount=30, source_type='POST', source_id='2')
        KarmaTransaction.objects.filter(id=t2.id).update(created_at=now - timedelta(hours=23))

        t3 = KarmaTransaction.objects.create(user=self.user, amount=100, source_type='POST', source_id='3')
        KarmaTransaction.objects.filter(id=t3.id).update(created_at=now - timedelta(hours=25))

        url = reverse('leaderboard')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertTrue(len(data) > 0)
        entry = data[0]
        self.assertEqual(entry['score'], 80, "Leaderboard included points from >24h ago!")