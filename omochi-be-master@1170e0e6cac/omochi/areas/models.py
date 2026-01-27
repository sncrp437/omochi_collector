from django.db import models

class Area(models.Model):
    prefecture = models.CharField(max_length=64)
    prefecture_en = models.CharField(blank=True, default='', verbose_name='Prefecture (English)')
    station = models.CharField(max_length=128)
    station_en = models.CharField(blank=True, default='', verbose_name='Station (English)')

    class Meta:
        unique_together = ('prefecture', 'station')
        verbose_name = 'Area'
        verbose_name_plural = 'Areas'
        ordering = ['prefecture', 'station']
        db_table = 'area'

    def __str__(self):
        return f"{self.prefecture} - {self.station}"