"""Validate bundled CDC data against its published percentile columns."""
import csv
import hashlib
import json
import math
import shutil
import tempfile
import unittest
from datetime import date
from pathlib import Path

from _stubs import add_project_root_to_path
add_project_root_to_path()
from cdc_reference import DATA_DIR, check_existing, load_reference
from growth_calc import calculate_sds, cdc_lookup_age, reference_age_months


class CDCReferenceTests(unittest.TestCase):
    def test_all_published_percentiles(self):
        self.assertEqual(len(load_reference()), 1308)
        for name in ("statage.csv", "wtage.csv", "bmiagerev.csv"):
            with (DATA_DIR / name).open() as source:
                for r in csv.DictReader(source):
                    if r["Sex"] == "Sex":
                        continue
                    l, m, s = (float(r[k]) for k in ("L", "M", "S"))
                    for column, expected in (("P5", -1.64485362695), ("P50", 0), ("P95", 1.64485362695)):
                        self.assertAlmostEqual(calculate_sds(float(r[column]), l, m, s), expected, places=5)

    def test_age_bins_and_strict_endpoints(self):
        for age, expected in [(23.999, None), (24, 24), (24.01, 24.5), (24.5, 24.5),
                              (25, 25.5), (239.99, 239.5), (240, 240), (240.001, None)]:
            self.assertEqual(cdc_lookup_age(age), expected)
        self.assertGreater(reference_age_months(date(2000, 1, 1), date(2020, 1, 2)), 240)
        self.assertEqual(reference_age_months(date(2000, 1, 1), date(2020, 1, 1)), 240)
        self.assertTrue(math.isfinite(reference_age_months(date(2020, 2, 29), date(2022, 2, 28))))

    def test_conflicts_and_missing_data(self):
        expected = load_reference()
        check_existing({}, expected)
        check_existing(expected, expected, complete=True)
        with self.assertRaises(RuntimeError):
            check_existing({}, expected, complete=True)
        with self.assertRaises(RuntimeError):
            check_existing({next(iter(expected)): (1, 1, 1)}, expected)

    def test_checksum_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory) / "cdc"
            shutil.copytree(DATA_DIR, folder)
            with (folder / "wtage.csv").open("ab") as target:
                target.write(b"tampered")
            with self.assertRaises(RuntimeError):
                load_reference(folder)

    def test_incomplete_file_even_with_valid_checksum(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory) / "cdc"
            shutil.copytree(DATA_DIR, folder)
            path = folder / "wtage.csv"
            path.write_bytes(b"\n".join(path.read_bytes().splitlines()[:-1]) + b"\n")
            manifest = json.loads((folder / "manifest.json").read_text())
            manifest["files"]["wtage.csv"]["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
            (folder / "manifest.json").write_text(json.dumps(manifest))
            with self.assertRaises(RuntimeError):
                load_reference(folder)


if __name__ == "__main__":
    unittest.main()
