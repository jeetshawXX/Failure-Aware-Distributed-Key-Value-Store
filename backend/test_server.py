from subprocess import CompletedProcess
from unittest import TestCase, main
from unittest.mock import patch

from fastapi import HTTPException
from pydantic import ValidationError

from backend.server import BASE_DIR, CLIENT_PATH, KVRequest, kv, run_client


class BackendServerTests(TestCase):
    @patch("backend.server.run_client", return_value="OK")
    def test_put_preserves_spaces_in_value(self, run_client_mock):
        response = kv(
            KVRequest(op="PUT", key="greeting", value="hello world"),
        )

        self.assertEqual(response, {"result": "OK"})
        run_client_mock.assert_called_once_with("PUT greeting hello world")

    @patch("backend.server.run_client", return_value="NOT_FOUND")
    def test_get_not_found_returns_404(self, run_client_mock):
        with self.assertRaises(HTTPException) as exc:
            kv(KVRequest(op="GET", key="missing"))

        self.assertEqual(exc.exception.status_code, 404)
        self.assertEqual(exc.exception.detail, "Key 'missing' not found")
        run_client_mock.assert_called_once_with("GET missing")

    @patch("backend.server.run_client", return_value="NODE_DOWN")
    def test_node_down_returns_503(self, run_client_mock):
        with self.assertRaises(HTTPException) as exc:
            kv(KVRequest(op="GET", key="missing"))

        self.assertEqual(exc.exception.status_code, 503)
        self.assertEqual(exc.exception.detail, "Storage replicas are unavailable")
        run_client_mock.assert_called_once_with("GET missing")

    def test_invalid_operation_is_rejected(self):
        with self.assertRaises(ValidationError):
            KVRequest(op="DELETE", key="missing")

    @patch("backend.server.subprocess.run")
    def test_run_client_uses_absolute_binary_path(self, subprocess_run_mock):
        subprocess_run_mock.return_value = CompletedProcess(
            args=[str(CLIENT_PATH)],
            returncode=0,
            stdout="OK\n",
            stderr="",
        )

        result = run_client("PUT sample value")

        self.assertEqual(result, "OK")
        subprocess_run_mock.assert_called_once_with(
            [str(CLIENT_PATH)],
            input="PUT sample value\nEXIT\n",
            capture_output=True,
            cwd=BASE_DIR,
            text=True,
            timeout=5,
            check=False,
        )


if __name__ == "__main__":
    main()
