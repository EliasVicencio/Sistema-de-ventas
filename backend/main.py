import sys
import os

# Asegura que la carpeta 'backend' esté en el path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app

__all__ = ["app"]