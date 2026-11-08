import React from "react";
import { DEFAULT_CARD_VARIANT, type CardVariant } from "../card-variant";
import { ProductPackageCardHero } from "./product-package-card-hero";
import { ProductPackageCardSpec } from "./product-package-card-spec";
import type { PackageCardLayoutProps } from "./product-card-parts";

export interface ProductPackageCardProps extends PackageCardLayoutProps {
  /** Which of the two validation layouts renders this package. */
  variant: CardVariant;
}

/**
 * The gondola card, in whichever layout the user picked in the product filters.
 *
 * The two layouts are alternatives under test, not a feature of the product: the
 * switch exists so real users can tell us which hierarchy reads better, and every
 * fact they render comes from the same `packageItem` through the same
 * `product-card-copy` module. A layout may change what the eye meets first; it may
 * not change what the card says.
 *
 * The dispatcher keeps that decision in one place, so the list, the tests and the
 * next layout all address a single component name.
 */
export function ProductPackageCard({
  variant = DEFAULT_CARD_VARIANT,
  ...props
}: ProductPackageCardProps) {
  return variant === "ficha" ? (
    <ProductPackageCardSpec {...props} />
  ) : (
    <ProductPackageCardHero {...props} />
  );
}
