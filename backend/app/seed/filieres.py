"""Authoritative filière catalog for ENSAM Meknès.

The CODE is the canonical identifier. This module is the single source of truth,
consumed by both the seed script and the initial Alembic migration.
"""

from __future__ import annotations

FILIERES: list[dict[str, str]] = [
    {"code": "API-MPT", "intitule": "Années Préparatoires Intégrées : Mathématique, Physique et Technologie", "departement": "AEEE", "accreditation": "2024"},
    {"code": "GC24", "intitule": "Génie Civil", "departement": "Mécanique", "accreditation": "2024"},
    {"code": "GE-DI", "intitule": "Génie Electromécanique : Digitalisation Industrielle", "departement": "AEEE", "accreditation": "2024"},
    {"code": "GE-MCI", "intitule": "Génie Electromécanique : Maintenance et Commande Industrielles", "departement": "AEEE", "accreditation": "2024"},
    {"code": "GI-ILSI", "intitule": "Génie Informatique : Ingénierie Logicielle et Systèmes Intelligents", "departement": "Maths Info", "accreditation": "2024"},
    {"code": "GIEO", "intitule": "Génie Industriel : Excellence Opérationnelle", "departement": "GIP", "accreditation": "2024"},
    {"code": "GIP24", "intitule": "Génie Industriel et Productique", "departement": "GIP", "accreditation": "2024"},
    {"code": "GM-CISM", "intitule": "Génie Mécanique : Conception et Industrialisation des Systèmes Mécaniques", "departement": "Mécanique", "accreditation": "2024"},
    {"code": "GM-IMS", "intitule": "Génie Mécanique : Ingénierie Mécanique et Structures", "departement": "Mécanique", "accreditation": "2024"},
    {"code": "GM-MPF", "intitule": "Génie Mécanique : Matériaux et Procédés de Fabrication", "departement": "Matériaux", "accreditation": "2024"},
    {"code": "GME24", "intitule": "Génie Mécanique : Energétique", "departement": "Energétique", "accreditation": "2024"},
    {"code": "IATD-SI", "intitule": "Intelligence Artificielle et Technologies des Données : Systèmes Industriels", "departement": "Maths Info", "accreditation": "2024"},
    {"code": "PEI", "intitule": "Parcours Electro Industriel", "departement": "ENSAM", "accreditation": "0"},
    {"code": "PM", "intitule": "Parcours Mécanique", "departement": "ENSAM", "accreditation": "0"},
    {"code": "API", "intitule": "Années Préparatoires Intégrées", "departement": "AEEE", "accreditation": "2020"},
    {"code": "CPI", "intitule": "Classes Préparatoires Intégrées", "departement": "MI", "accreditation": "2014"},
    {"code": "TC3A-24", "intitule": "Tronc Commun 3A - 2024", "departement": "ENSAM", "accreditation": "2024"},
    {"code": "TC4A-24", "intitule": "Tronc Commun 4A - 2024", "departement": "ENSAM", "accreditation": "2024"},
    {"code": "TC4A", "intitule": "Tronc Commun 4A", "departement": "ENSAM", "accreditation": "2018"},
    {"code": "TC5A", "intitule": "Tronc Commun 5A", "departement": "ENSAM", "accreditation": "2018"},
    {"code": "GEC", "intitule": "Génie Electromécanique : Commande et Management Industriel", "departement": "AEEE", "accreditation": "2019"},
    {"code": "GEE", "intitule": "Génie Electromécanique : Energie et Maintenance Electromécanique", "departement": "AEEE", "accreditation": "2019"},
    {"code": "GIIA", "intitule": "Génie Industriel : Intelligence Artificielle et Data Science", "departement": "Mathématiques Informatique", "accreditation": "2019"},
    {"code": "GIPR", "intitule": "Génie Industriel et Productique", "departement": "GIP", "accreditation": "2020"},
    {"code": "GME", "intitule": "Génie Mécanique : Energétique", "departement": "Energétique", "accreditation": "2019"},
    {"code": "GMP", "intitule": "Génie Mécanique : Procédés de Fabrication Industrielle", "departement": "Matériaux et Procédés", "accreditation": "2019"},
    {"code": "GMS", "intitule": "Génie Mécanique : Structures et Ingénierie des Produits", "departement": "GMS", "accreditation": "2019"},
    {"code": "CIVIL", "intitule": "Génie Civil", "departement": "GM", "accreditation": "2019"},
    {"code": "DS2M", "intitule": "Master science des données pour une industrie intelligente", "departement": "GIP", "accreditation": "2024"},
    {"code": "EMSI", "intitule": "Electromécanique et Systèmes Industriels", "departement": "AEEE", "accreditation": "2014"},
    {"code": "GC", "intitule": "Génie Civil", "departement": "GM", "accreditation": "2014"},
    {"code": "GIP", "intitule": "Génie Industriel et Productique", "departement": "GIP", "accreditation": "2014"},
    {"code": "GM", "intitule": "Génie Mécanique", "departement": "GM", "accreditation": "2014"},
    {"code": "GTIER", "intitule": "Génie Thermique Industrielle et Energies Renouvelables", "departement": "Energ", "accreditation": "2014"},
    {"code": "IPP", "intitule": "Industrialisation des Produits et Procédés", "departement": "Mat", "accreditation": "2014"},
    {"code": "TC3A", "intitule": "Tronc Commun 3A", "departement": "ENSAM", "accreditation": "2018"},
    {"code": "M2I", "intitule": "Master Modélisation Mathématique en Ingénierie", "departement": "MI", "accreditation": "2017"},
]
