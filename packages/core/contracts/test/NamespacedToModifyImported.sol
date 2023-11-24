// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {CONSTANT_USING_SELECTOR, plusTwo, plusThree, CustomErrorOutsideContract, Example as ParentExample} from "./NamespacedToModify.sol";

contract Example {
  using {plusTwo} for uint;
  error ChildCustomError(ParentExample a);
}