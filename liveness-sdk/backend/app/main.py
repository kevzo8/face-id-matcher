import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import config
from .api.routes import router, poc_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=getattr(logging, config.log_level.upper(), logging.INFO))
    logger = logging.getLogger("svi")
    logger.info("SVI Biometrics Liveness Backend starting — environment: %s", config.environment)

    from .liveness.engine import LivenessEngine
    engine = LivenessEngine()
    app.state.engine = engine
    logger.info("Providers status: %s", engine.get_status())

    yield

    logger.info("SVI Biometrics Liveness Backend shutting down")


app = FastAPI(
    title="SVI Biometrics Liveness API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")
app.include_router(poc_router)
