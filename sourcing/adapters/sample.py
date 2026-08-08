#!/usr/bin/env python3
"""
Sample adapter — deterministic fixtures, no network, no API key.

This mirrors the `--sample` mode already used by scripts/scrape_inventory.py:
it lets the entire pipeline (store -> match -> alert) run and be tested end to
end without depending on a live site or a paid API. It also seeds a couple of
listings that deliberately match wants.example.json, so a first run shows real
output.
"""
from __future__ import annotations

from typing import Iterable

from ..models import Listing, Want
from .base import SearchAdapter

# A small, realistic Canadian used/CPO pool. Prices in CAD, odo in km.
_FIXTURES = [
    dict(listing_id="s-1001", vin="JTJHZKFA1P2000001", year=2023, make="Lexus",
         model="RX 350", trim="Luxury AWD", price=61900, odometer=28450,
         condition="Certified Pre-Owned", drivetrain="AWD", body="SUV",
         exterior="Nori Green Pearl", city="Mississauga", province="ON",
         seller_type="dealer", seller_name="Downtown Lexus",
         url="https://www.autotrader.ca/a/lexus/rx%20350/mississauga/on/s-1001/",
         extra={"description": "panoramic roof, Mark Levinson audio, heated steering wheel"}),
    dict(listing_id="s-1002", vin="JTJHZKFA1P2000002", year=2022, make="Lexus",
         model="RX 350", trim="F Sport 2 AWD", price=54200, odometer=51200,
         condition="Used", drivetrain="AWD", body="SUV",
         exterior="Ultra White", city="Ottawa", province="ON",
         seller_type="dealer", seller_name="Capital Auto Group",
         url="https://www.autotrader.ca/a/lexus/rx%20350/ottawa/on/s-1002/",
         extra={"description": "AWD, heated steering wheel, blind spot monitor"}),
    dict(listing_id="s-1003", vin="JTJHZKFA1P2000003", year=2021, make="Lexus",
         model="NX 300", trim="AWD", price=39900, odometer=68000,
         condition="Used", drivetrain="AWD", body="SUV",
         exterior="Caviar", city="Vancouver", province="BC",
         seller_type="private", seller_name="Private seller",
         url="https://www.autotrader.ca/a/lexus/nx%20300/vancouver/bc/s-1003/",
         extra={"description": "one owner, no accidents"}),
    dict(listing_id="s-1004", vin="WBA5R7C50KA000004", year=2023, make="BMW",
         model="X3", trim="xDrive30i", price=52995, odometer=31000,
         condition="Certified Pre-Owned", drivetrain="AWD", body="SUV",
         exterior="Alpine White", city="Toronto", province="ON",
         seller_type="dealer", seller_name="Town+Country BMW",
         url="https://www.autotrader.ca/a/bmw/x3/toronto/on/s-1004/",
         extra={"description": "premium package, panoramic roof, heated steering wheel"}),
    dict(listing_id="s-1005", vin="JTJHZKFA1P2000005", year=2024, make="Lexus",
         model="RX 350", trim="Premium AWD", price=68800, odometer=9200,
         condition="Certified Pre-Owned", drivetrain="AWD", body="SUV",
         exterior="Cloudburst Grey", city="Calgary", province="AB",
         seller_type="dealer", seller_name="Foothills Lexus",
         url="https://www.autotrader.ca/a/lexus/rx%20350/calgary/ab/s-1005/",
         extra={"description": "like new, panoramic roof"}),
]


class SampleAdapter(SearchAdapter):
    name = "sample"

    def search(self, want: Want) -> Iterable[Listing]:
        for f in _FIXTURES:
            yield Listing(source=self.name, **f)
