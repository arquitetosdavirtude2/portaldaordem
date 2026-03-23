from database import engine, Base
import models # Ensure models are imported so they are registered in Base.metadata

print("Creating tables in MySQL if they don't exist...")
try:
    Base.metadata.create_all(bind=engine)
    print("Tables created/verified successfully!")
except Exception as e:
    print(f"Error creating tables: {e}")
