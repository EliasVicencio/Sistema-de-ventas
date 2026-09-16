import os
import sys

# Asegurar que 'backend' esté en el path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# ================================================================
# Mocks de variables de entorno para tests
# ================================================================
# Estos valores solo se usan en tests unitarios que NO tocan
# servicios externos. Nunca se usan en producción.
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret-not-real")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")