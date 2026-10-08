from datetime import datetime, timezone

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.modules.users.model import User
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import (
    AdminCustomerResponse,
    UserGoogleCreate,
    UserResponse,
    UserUpdate,
)
from app.modules.orders.model import Order
from app.shared.enums import OrderStatus, UserRole


class UserService:

    @staticmethod
    def get_user_by_id(
        db: Session,
        user_id: int,
    ) -> User | None:

        return UserRepository.get_by_id(
            db,
            user_id,
        )


    @staticmethod
    def get_user_by_google_id(
        db: Session,
        google_id: str,
    ) -> User | None:

        return UserRepository.get_by_google_id(
            db,
            google_id,
        )


    @staticmethod
    def get_user_by_email(
        db: Session,
        email: str,
    ) -> User | None:

        return UserRepository.get_by_email(
            db,
            email,
        )


    @staticmethod
    def get_or_create_google_user(
        db: Session,
        user_data: UserGoogleCreate,
    ) -> User:

        user = UserRepository.get_by_google_id(
            db,
            user_data.google_id,
        )

        if user is None:

            user = UserRepository.get_by_email(
                db,
                user_data.email,
            )

        if user is None:

            user = UserRepository.create_from_google(
                db,
                user_data,
            )

        else:

            user.first_name = user_data.first_name
            user.last_name = user_data.last_name
            user.avatar_url = user_data.avatar_url
            user.email_verified = user_data.email_verified

        user.last_login_at = datetime.now(
            timezone.utc
        ).replace(tzinfo=None)

        return UserRepository.update(
            db,
            user,
        )


    @staticmethod
    def update_profile(
        db: Session,
        user: User,
        user_data: UserUpdate,
    ) -> User:
        changes = user_data.model_dump(exclude_unset=True)
        for field, value in changes.items():
            setattr(user, field, value)

        return UserRepository.update(
            db,
            user,
        )

    @staticmethod
    def list_customers(
        db: Session,
        search: str | None = None,
        limit: int = 100,
    ) -> list[AdminCustomerResponse]:
        statement = (
            select(
                User,
                func.count(Order.id).label("orders_count"),
                func.coalesce(
                    func.sum(
                        case(
                            (Order.status != OrderStatus.CANCELLED, Order.total),
                            else_=0,
                        )
                    ),
                    0,
                ).label("total_spent"),
            )
            .outerjoin(Order, Order.user_id == User.id)
            .where(User.role == UserRole.CUSTOMER)
            .group_by(User.id)
            .order_by(User.created_at.desc())
            .limit(limit)
        )
        if search and search.strip():
            term = f"%{search.strip()}%"
            statement = statement.where(
                (User.email.ilike(term))
                | (User.first_name.ilike(term))
                | (User.last_name.ilike(term))
            )

        return [
            AdminCustomerResponse(
                **UserResponse.model_validate(user).model_dump(),
                orders_count=int(orders_count or 0),
                total_spent=total_spent or 0,
            )
            for user, orders_count, total_spent in db.execute(statement).all()
        ]
