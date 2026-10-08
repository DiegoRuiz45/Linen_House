from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.modules.addresses.model import Address
from app.modules.addresses.schemas import AddressCreate


class AddressRepository:

    @staticmethod
    def get_all_by_user(
        db: Session,
        user_id: int,
    ) -> list[Address]:

        statement = (
            select(Address)
            .where(
                Address.user_id == user_id
            )
            .order_by(
                Address.is_default.desc(),
                Address.created_at.asc(),
            )
        )

        return list(
            db.scalars(statement).all()
        )


    @staticmethod
    def get_by_id_and_user(
        db: Session,
        address_id: int,
        user_id: int,
    ) -> Address | None:

        statement = select(Address).where(
            Address.id == address_id,
            Address.user_id == user_id,
        )

        return db.scalar(statement)


    @staticmethod
    def create(
        db: Session,
        user_id: int,
        data: AddressCreate,
    ) -> Address:

        address = Address(
            user_id=user_id,
            department=data.department,
            city=data.city,
            address=data.address,
            address_extra=data.address_extra,
            postal_code=data.postal_code,
            notes=data.notes,
            is_default=data.is_default,
        )

        db.add(address)
        db.commit()
        db.refresh(address)

        return address


    @staticmethod
    def save(
        db: Session,
        address: Address,
    ) -> Address:

        db.add(address)
        db.commit()
        db.refresh(address)

        return address


    @staticmethod
    def unset_default_addresses(
        db: Session,
        user_id: int,
        exclude_address_id: int | None = None,
    ) -> None:

        statement = (
            update(Address)
            .where(
                Address.user_id == user_id
            )
        )

        if exclude_address_id is not None:

            statement = statement.where(
                Address.id != exclude_address_id
            )

        statement = statement.values(
            is_default=False
        )

        db.execute(statement)
        db.commit()


    @staticmethod
    def delete(
        db: Session,
        address: Address,
    ) -> None:

        db.delete(address)
        db.commit()