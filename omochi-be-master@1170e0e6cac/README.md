# Omochi Backend

Omochi is a restaurant management and ordering platform. This repository contains the backend API built with Django and Django REST Framework.

## Installation and Setup

### Prerequisites

- Python 3.13 or higher
- UV package manager
- PostgreSQL 17 (or use the included Docker setup)

### Setup with UV (Recommended)

UV is a fast Python package installer and resolver. It's recommended for this project for improved performance and dependency management.

1. **Install UV**

   If you don't have UV installed, you can install it using:

   ```bash
   # Install with curl (Linux/macOS)
   curl -LsSf https://astral.sh/uv/install.sh | sh

   # Or install with pip
   pip install uv
   
   ```

2. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd omochi-be
   ```

3. **Create and activate a virtual environment with UV**

   ```bash
   # Create a new virtual environment with Python 3.13
   uv venv -p python3.13

   # Activate the environment
   # On Linux/macOS:
   source .venv/bin/activate
   # On Windows:
   .venv\Scripts\activate
   ```

4. **Install dependencies**

   ```bash
   uv pip install -e .
   ```

5. **Create an environment file**

   Create a `.env` file in the root directory with the following variables:

   ```
   DEBUG=True
   SECRET_KEY=your-secret-key
   DB_NAME=omochi_db
   DB_USER=omochi_user
   DB_PASSWORD=omochi_password
   DB_HOST=localhost
   DB_PORT=5432
   ```

### Database Setup

#### Option 1: Using Docker (Recommended)

1. **Start the PostgreSQL database with Docker**

   ```bash
   docker-compose up -d
   ```

   This will start a PostgreSQL 17 database using the credentials specified in your `.env` file.

#### Option 2: Manual PostgreSQL Setup

1. **Install and configure PostgreSQL**
   
   Install PostgreSQL 17 and create a database and user with the credentials specified in your `.env` file.

### Running Migrations and Starting the Server

1. **Apply migrations**

   ```bash
   python manage.py migrate
   ```

2. **Create a superuser (optional)**

   ```bash
   python manage.py createsuperuser
   ```

3. **Start the development server**

   ```bash
   python manage.py runserver
   ```

   The API will be available at http://127.0.0.1:8000/

### Seeding the Database

You can populate the database with initial data for development or testing:

```bash
# Seed the database with initial data
python manage.py seed_db

# To first delete existing data and then seed
python manage.py seed_db --flush
```

This will create sample users, venues, menu categories, menu items, time slots, and coupons. For more information, see [Seed Solution Documentation](docs/seed_solution.md).

## API Documentation

After running the server, you can access the API documentation at:

- Swagger UI: http://127.0.0.1:8000/api/docs/
- ReDoc: http://127.0.0.1:8000/api/redoc/

## Development

### Running Tests

```bash
python manage.py test
```

### Code Formatting and Linting

It's recommended to use tools like Black, isort, and flake8 for maintaining code quality.

```bash
# Install development tools
uv pip install black isort flake8

# Format code
black .
isort .

# Run linting
flake8
```

## Project Structure

- `omochi/` - Main Django project directory
  - `users/` - User authentication and management
  - `venues/` - Restaurant venues management
  - `menus/` - Menu and item management
  - `orders/` - Order processing
  - `reservations/` - Table reservations
  - `notifications/` - Notification system
  - `qr_codes/` - QR code generation for tables/orders