import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useCreateCustomer, useUpdateCustomer } from "./useCustomersData";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/api/client";

const createSchema = yup.object({
  name: yup.string().required("Name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  username: yup.string().nullable(),
  phone: yup.string().nullable(),
  password: yup.string().min(6, "At least 6 characters").required("Password is required"),
  password_confirmation: yup.string().oneOf([yup.ref("password")], "Passwords don't match").required("Please confirm the password"),
});

const editSchema = yup.object({
  name: yup.string().required("Name is required"),
  email: yup.string().email("Invalid email").nullable(),
  username: yup.string().nullable(),
  phone: yup.string().nullable(),
});

const CustomerFormModal = ({ open, onClose, customer }) => {
  const isEdit = Boolean(customer);
  const createMut = useCreateCustomer();
  const updateMut = useUpdateCustomer();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(isEdit ? editSchema : createSchema),
  });

  useEffect(() => {
    if (open) {
      reset(isEdit ? { name: customer.name, email: customer.email, username: customer.username, phone: customer.phone } : {});
    }
  }, [open, customer]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await updateMut.mutateAsync({ id: customer.id, name: data.name, email: data.email, username: data.username, phone: data.phone, subscriptionFrom: customer.subscription_from });
        toast.success("Customer updated.");
      } else {
        await createMut.mutateAsync({ name: data.name, email: data.email, username: data.username, phone: data.phone, password: data.password, passwordConfirmation: data.password_confirmation });
        toast.success("Customer created.");
      }
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Something went wrong."));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Customer" : "Add Customer"} className="max-w-md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Name</label>
          <input {...register("name")} className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
          {errors.name && <p className="text-xs text-danger-500 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Email</label>
          <input {...register("email")} type="email" className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
          {errors.email && <p className="text-xs text-danger-500 mt-1">{errors.email.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Username</label>
            <input {...register("username")} className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Phone</label>
            <input {...register("phone")} className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
          </div>
        </div>
        {!isEdit && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Password</label>
              <input {...register("password")} type="password" className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
              {errors.password && <p className="text-xs text-danger-500 mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Confirm</label>
              <input {...register("password_confirmation")} type="password" className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
              {errors.password_confirmation && <p className="text-xs text-danger-500 mt-1">{errors.password_confirmation.message}</p>}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting || createMut.isPending || updateMut.isPending}>{isEdit ? "Save" : "Create"}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerFormModal;
