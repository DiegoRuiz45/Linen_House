import os
import unittest

from fastapi.routing import APIRoute


os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("DB_NAME", "linen_house_test")
os.environ.setdefault("SESSION_SECRET_KEY", "test-secret-key-with-at-least-32-characters")


from app.main import app  # noqa: E402


def dependency_names(dependant):
    names = set()
    for dependency in dependant.dependencies:
        if dependency.call is not None:
            names.add(getattr(dependency.call, "__name__", repr(dependency.call)))
        names.update(dependency_names(dependency))
    return names


class RouteSecurityTests(unittest.TestCase):
    def test_every_admin_endpoint_requires_admin_role(self):
        admin_routes = [
            route
            for route in app.routes
            if isinstance(route, APIRoute)
            and route.path.startswith("/api/v1/admin/")
        ]
        self.assertTrue(admin_routes)
        for route in admin_routes:
            with self.subTest(path=route.path, methods=route.methods):
                self.assertIn("require_admin", dependency_names(route.dependant))

    def test_every_mutating_api_route_has_origin_protection(self):
        mutating = {"POST", "PUT", "PATCH", "DELETE"}
        routes = [
            route
            for route in app.routes
            if isinstance(route, APIRoute)
            and route.path.startswith("/api/v1/")
            and route.methods.intersection(mutating)
        ]
        self.assertTrue(routes)
        for route in routes:
            with self.subTest(path=route.path, methods=route.methods):
                self.assertIn(
                    "require_trusted_origin",
                    dependency_names(route.dependant),
                )


if __name__ == "__main__":
    unittest.main()
