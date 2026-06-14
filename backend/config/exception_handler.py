from rest_framework.views import exception_handler as drf_exception_handler

def api_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    response.data = {
        "error": {
            "status": response.status_code,
            "type": exc.__class__.__name__,
            "detail": response.data,
        }
    }
    return response
