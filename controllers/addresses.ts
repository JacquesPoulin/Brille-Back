import { Request, Response, NextFunction, RequestHandler } from 'express';
import * as Address from '../models/address';
import IAddress from '../interfaces/IAddress';
import { ErrorHandler } from '../helpers/errors';
import { formatSortString } from '../helpers/functions';
import Joi from 'joi';

///////////// ADDRESS ///////////
// validates input
const validateAddress = (req: Request, res: Response, next: NextFunction) => {
  let required: Joi.PresenceMode = 'optional';
  if (req.method === 'POST') {
    required = 'required';
  }
  const errors = Joi.object({
    addressLine1: Joi.string().max(255).presence(required),
    addressLine2: Joi.string().max(255).allow(null).optional(),
    city: Joi.string().max(200).allow(null).optional(),
    country: Joi.string().max(200).allow(null).optional(),
    zipCode: Joi.number().allow(null).optional(),
    idUser: Joi.number().presence(required),
    id: Joi.number().optional(), // pour react-admin
  }).validate(req.body, { abortEarly: false }).error;
  if (errors) {
    console.log(errors.message);
    next(new ErrorHandler(422, errors.message));
  } else {
    next();
  }
};

// checks if an address exists before update or delete
const addressExists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { idAddress } = req.params;

  const addressExists: IAddress = await Address.getAddressById(
    Number(idAddress)
  );
  if (!addressExists) {
    next(new ErrorHandler(409, `This address does not exist`));
  } else {
    req.record = addressExists; // because we need deleted record to be sent after a delete in react-admin
    next();
  }
};

// returns all addresses
const getAllAddresses = (async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const sortBy: string = req.query.sort as string;
    const addresses = await Address.getAllAddresses(formatSortString(sortBy));
    res.setHeader(
      'Content-Range',
      `addresses : 0-${addresses.length}/${addresses.length + 1}`
    );
    res.status(200).json(addresses);
  } catch (err) {
    next(err);
  }
}) as RequestHandler;

// get address by id
const getAddressById = (async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { idAddress } = req.params;
    const address = await Address.getAddressById(Number(idAddress));
    address ? res.status(200).json(address) : res.sendStatus(404);
  } catch (err) {
    next(err);
  }
}) as RequestHandler;

// delete address by id
const deleteAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { idAddress } = req.params;
    const addressDeleted = await Address.deleteAddress(Number(idAddress));
    if (addressDeleted) {
      res.status(200).send(req.record); // react-admin needs this response
    } else {
      throw new ErrorHandler(409, `Address not found`);
    }
  } catch (err) {
    next(err);
  }
};

const addAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const addressId = await Address.addAddress(req.body as IAddress);
    if (addressId) {
      res.status(201).json({ id: addressId, ...req.body });
    } else {
      throw new ErrorHandler(500, `Address cannot be created`);
    }
  } catch (err) {
    next(err);
  }
};

const updateAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { idAddress } = req.params;
    const addressUpdated = await Address.updateAddress(
      Number(idAddress),
      req.body as IAddress
    );
    if (addressUpdated) {
      const address = await Address.getAddressById(Number(idAddress));
      res.status(200).send(address); // react-admin needs this response
    } else {
      throw new ErrorHandler(500, `Address cannot be updated`);
    }
  } catch (err) {
    next(err);
  }
};

export default {
  getAllAddresses,
  getAddressById,
  deleteAddress,
  addAddress,
  updateAddress,
  validateAddress,
  addressExists,
};
