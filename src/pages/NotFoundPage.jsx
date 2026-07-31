import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";

const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center p-6">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="text-center"
    >
      <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--surface-sunken)] flex items-center justify-center mb-5">
        <Icon icon="solar:compass-broken" className="text-3xl text-[var(--ink-tertiary)]" />
      </div>
      <h1 className="text-3xl font-bold text-[var(--ink-primary)]">Page not found</h1>
      <p className="text-[var(--ink-secondary)] mt-2 mb-6">
        You don't have access to this page, or it doesn't exist.
      </p>
      <Link to="/">
        <Button icon="solar:home-2-bold">Back to home</Button>
      </Link>
    </motion.div>
  </div>
);

export default NotFoundPage;
