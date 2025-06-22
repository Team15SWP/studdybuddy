from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from auth import authenticate_user, create_access_token, Token

router = APIRouter()


@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        return JSONResponse(status_code=401, content={"detail": "Invalid credentials"})

    token = create_access_token(data={"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}
