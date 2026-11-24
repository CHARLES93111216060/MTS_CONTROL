
DEVICE = {
    "brand": "MTS",
    "model": "Sistema de terapia por ondas de choque",
    "firmware": "v2.4.1",
}

# Enlace que aparece en todas las páginas (bisel inferior del equipo).
PROMO = {
    "url": "https://wavevision.at/es/",
    "text": "Curso de ondas de choque en línea - Certificación ISMST",
}

# Página que actúa como menú principal (la intro "page0" navega a ella).
HOME_PAGE = "inicio"
BODYMAP_PAGE = "mapa"

# Título visible de cada página.
TITLES = {
    "inicio": "Menú principal",
    "mapa": "Fisioterapia y rehabilitación",
    "patologias": "Patologías",
    "ortopedia": "Ortopedia",
    "dermatologia": "Dermatología",
    "estetica": "Estética",
    "urogenital": "Urogenital",
    "page3": "Región posterior del cráneo y columna cervical",
    "page4": "Región torácica posterior",
    "page5": "Región lumbar",
    "page6": "Miembro inferior izquierdo posterior",
    "page7": "Miembro inferior derecho posterior",
}

# Nombre corto (tarjetas de menú, migas de pan, zonas del mapa corporal).
SHORT = {
    "inicio": "Inicio",
    "mapa": "Fisioterapia y rehabilitación",
    "page3": "Cervical",
    "page4": "Torácica",
    "page5": "Lumbar",
    "page6": "Miembro inf. izquierdo",
    "page7": "Miembro inf. derecho",
}

# Descripción bajo cada opción de menú.
DESCRIPTIONS = {
    "mapa": "Selección de zona anatómica y parámetros manuales",
    "patologias": "Protocolos clínicos con parámetros recomendados",
    "ortopedia": "Tendinopatías, fascitis y lesiones óseas",
    "dermatologia": "Cicatrización, úlceras y quemaduras",
    "estetica": "Celulitis, estrías y linfedema",
    "urogenital": "Peyronie, disfunción eréctil y dolor pélvico",
}

# Protocolos clínicos (textos extraídos de las imágenes originales).
PROTOCOLS = {
    "pinzamiento": {
        "short": "Pinzamiento con o sin tendinosis",
        "title": "Síndrome de pinzamiento con o sin tendinosis calcificada (tendinitis calcificante)",
        "applicator": "OE050S",
    },
    "epicondilitis": {
        "short": "Epicondilitis",
        "title": "Epicondilitis humeral radial y cubital",
        "applicator": "OE050",
    },
    "tendon": {
        "short": "Síndrome del tendón rotuliano",
        "title": "Síndrome del tendón rotuliano",
        "applicator": "OE050S",
    },
    "fascitis": {
        "short": "Fascitis plantar",
        "title": "Fascitis plantar y espolón calcáneo",
        "applicator": "OE050S",
    },
    "aquilodinia": {
        "short": "Aquilodinia",
        "title": "Aquilodinia",
        "applicator": "OE050S",
    },
    "gatillo": {
        "short": "Síndrome del punto gatillo",
        "title": "Síndrome del punto gatillo",
        "applicator": "OE050S",
    },
    "pseudoartrosis": {
        "short": "Pseudoartrosis",
        "title": "Pseudoartrosis en huesos pequeños (también infectados)",
        "applicator": "OE050S",
    },
    "postraumatismo": {
        "short": "Lesiones postraumáticas",
        "title": "Lesiones postraumáticas",
        "applicator": "OP155S",
    },
    "cicatrizacion": {
        "short": "Cicatrización post-operatoria",
        "title": "Trastorno de cicatrización post-operatoria",
        "applicator": "OP155S",
    },
    "ulcera": {
        "short": "Úlcera del pie diabético",
        "title": "Úlcera del pie diabético",
        "applicator": "OP155S",
    },
    "quemaduras": {
        "short": "Quemaduras",
        "title": "Quemaduras",
        "applicator": "OP155S",
    },
    "celulitis": {
        "short": "Celulitis",
        "title": "Celulitis",
        "applicator": "OP155S",
    },
    "estrias": {
        "short": "Cicatrices y estrías",
        "title": "Cicatrices / Estrías",
        "applicator": "OP155S",
    },
    "linfedema": {
        "short": "Linfedema",
        "title": "Linfedema",
        "applicator": "OP155S",
    },
    "peyronie": {
        "short": "Enfermedad de Peyronie",
        "title": "Síndrome de Peyronie",
        "applicator": "OE050S",
        "note": "Se recomienda aplicar ondas de choque en cada zona afectada del "
                "cuerpo del pene donde se encuentran las placas.",
    },
    "disfuncion": {
        "short": "Disfunción eréctil",
        "title": "Disfunción eréctil",
        "applicator": "OP155S",
        "note": "Se recomienda aplicar manualmente sobre el eje distal, medio y "
                "proximal del pene y en la zona izquierda y derecha del eje del pene.",
    },
    "dolor_pelvis": {
        "short": "Dolor pélvico crónico",
        "title": "Síndrome de dolor pélvico crónico",
        "applicator": "OP155S",
        "note": "Se recomienda aplicar directamente en la zona perineal (desde el ano "
                "hasta el escroto) en la dirección en la que se encuentra el dolor.",
    },
}

# Parámetros de las páginas de protocolo.
#   slider: componente del .HMI del que se leen rango y valor por defecto
#   scale:  factor para pasar del valor entero del slider al valor real
#   min_raw / step_raw: límites de seguridad y paso de ajuste (en unidades del slider)
PROTOCOL_PARAMS = [
    {"key": "energy", "slider": "h0", "label": "Energía", "unit": "mJ/mm²",
     "scale": 0.01, "decimals": 2, "min_raw": 1, "step_raw": 1},
    {"key": "frequency", "slider": "h1", "label": "Frecuencia", "unit": "Hz",
     "scale": 1, "decimals": 0, "min_raw": 1, "step_raw": 1},
    {"key": "pulses", "slider": "h2", "label": "Número de pulsos", "unit": "pulsos",
     "scale": 1, "decimals": 0, "min_raw": 100, "step_raw": 10},
]

# Parámetros de las páginas de zona anatómica (page3..page7).
# Los rótulos de frecuencia e intensidad se leen de los textos t0 / t1 del .HMI.
# El número de pulsos no existía en estas páginas: se añade para poder simular la sesión.
REGION_PARAMS = [
    {"key": "frequency", "slider": "h0", "label_from": "t0", "label": "Frecuencia",
     "unit": "Hz", "scale": 1, "decimals": 0, "min_raw": 1, "step_raw": 1},
    {"key": "intensity", "slider": "h1", "label_from": "t1", "label": "Intensidad",
     "unit": "J", "scale": 1, "decimals": 0, "min_raw": 1, "step_raw": 1},
    {"key": "pulses", "slider": None, "label": "Número de pulsos", "unit": "pulsos",
     "scale": 1, "decimals": 0, "min_raw": 100, "max_raw": 5000, "default_raw": 2000,
     "step_raw": 10},
]
