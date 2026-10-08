from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.addresses.model import Address
from app.modules.addresses.repository import AddressRepository
from app.modules.addresses.schemas import (
    AddressCreate,
    AddressUpdate,
)


class AddressService:

    @staticmethod
    def get_user_addresses(
        db: Session,
        user_id: int,
    ) -> list[Address]:

        return AddressRepository.get_all_by_user(
            db,
            user_id,
        )


    @staticmethod
    def create_address(
        db: Session,
        user_id: int,
        data: AddressCreate,
    ) -> Address:

        current_addresses = (
            AddressRepository.get_all_by_user(
                db,
                user_id,
            )
        )

        # La primera dirección siempre será principal.
        if not current_addresses:
            data.is_default = True

        # Si se solicita como principal,
        # las demás dejan de serlo.
        if data.is_default:

            AddressRepository.unset_default_addresses(
                db,
                user_id,
            )

        return AddressRepository.create(
            db,
            user_id,
            data,
        )


    @staticmethod
    def update_address(
        db: Session,
        user_id: int,
        address_id: int,
        data: AddressUpdate,
    ) -> Address:

        address = (
            AddressRepository.get_by_id_and_user(
                db,
                address_id,
                user_id,
            )
        )

        if address is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dirección no encontrada.",
            )


        update_data = data.model_dump(
            exclude_unset=True
        )


        if update_data.get("is_default") is True:

            AddressRepository.unset_default_addresses(
                db,
                user_id,
                exclude_address_id=address.id,
            )


        for field, value in update_data.items():

            setattr(
                address,
                field,
                value,
            )


        return AddressRepository.save(
            db,
            address,
        )


    @staticmethod
    def delete_address(
        db: Session,
        user_id: int,
        address_id: int,
    ) -> None:

        address = (
            AddressRepository.get_by_id_and_user(
                db,
                address_id,
                user_id,
            )
        )

        if address is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dirección no encontrada.",
            )


        was_default = address.is_default


        AddressRepository.delete(
            db,
            address,
        )


        # Si eliminamos la principal,
        # seleccionamos otra automáticamente.
        if was_default:

            remaining_addresses = (
                AddressRepository.get_all_by_user(
                    db,
                    user_id,
                )
            )


            if remaining_addresses:

                new_default = (
                    remaining_addresses[0]
                )

                new_default.is_default = True

                AddressRepository.save(
                    db,
                    new_default,
                )