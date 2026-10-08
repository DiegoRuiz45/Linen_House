from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.users.model import User
from app.modules.users.schemas import UserGoogleCreate


class UserRepository:

    @staticmethod
    def get_by_id(
        db: Session,
        user_id: int,
    ) -> User | None:

        statement = select(User).where(
            User.id == user_id
        )

        return db.scalar(statement)


    @staticmethod
    def get_by_email(
        db: Session,
        email: str,
    ) -> User | None:

        statement = select(User).where(
            User.email == email
        )

        return db.scalar(statement)


    @staticmethod
    def get_by_google_id(
        db: Session,
        google_id: str,
    ) -> User | None:

        statement = select(User).where(
            User.google_id == google_id
        )

        return db.scalar(statement)


    @staticmethod
    def create_from_google(
        db: Session,
        user_data: UserGoogleCreate,
    ) -> User:

        user = User(
            google_id=user_data.google_id,
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            avatar_url=user_data.avatar_url,
            email_verified=user_data.email_verified,
        )

        db.add(user)

        db.commit()

        db.refresh(user)

        return user


    @staticmethod
    def update(
        db: Session,
        user: User,
    ) -> User:

        db.add(user)

        db.commit()

        db.refresh(user)

        return user