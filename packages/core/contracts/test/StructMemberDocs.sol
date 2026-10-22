// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Each state variable has the same comments as the struct member with the same name, so that the annotations that
// solc reads for the state variable are the expected annotations of the member.
contract StructMemberDocs {
    /// @custom:oz-renamed-from a
    /// @custom:oz-retyped-from uint8
    uint256 consecutiveLines;

    /// @custom:oz-renamed-from a

    /// @custom:oz-retyped-from uint8
    uint256 blankLineBetweenLines;

    // The line between the two doc comments below contains only whitespace on purpose
    /// @custom:oz-renamed-from a
    	 
    /// @custom:oz-retyped-from uint8
    uint256 whitespaceLineBetween;

    /// @custom:oz-renamed-from a
    ///
    /// @custom:oz-retyped-from uint8
    uint256 emptyLine;

    /// @custom:oz-renamed-from a
    //// @custom:oz-retyped-from uint8
    uint256 fourSlashesEndRun;

    //// @custom:oz-renamed-from a
    uint256 fourSlashes;

    /// @custom:oz-renamed-from a
    // @custom:oz-retyped-from uint8
    uint256 plainCommentAfter;

    /// @custom:oz-renamed-from a
    // x
    /// @custom:oz-retyped-from uint8
    uint256 plainCommentBetween;

    /// @custom:oz-renamed-from a
    /* @custom:oz-retyped-from uint8 */
    uint256 plainBlockAfter;

    /// @custom:oz-renamed-from a
    /**/
    uint256 emptyBlockAfter;

    /// @custom:oz-renamed-from a
    /***/
    uint256 threeStarsAfter;

    /// @custom:oz-renamed-from a
    /*** @custom:oz-retyped-from uint8 */
    uint256 tripleStarOpen;

    /// @custom:oz-renamed-from a
    /** */
    uint256 blankDocBlockAfter;

    /**
     * @custom:oz-renamed-from a
     *
     * @custom:oz-retyped-from uint8
     */
    uint256 starPrefixes;

    // The middle line of the block below ends with a space on purpose
    /**
     * @custom:oz-renamed-from a
     * 
     * @custom:oz-retyped-from uint8
     */
    uint256 starSpaceLine;

    /** @custom:oz-renamed-from a
        @custom:oz-retyped-from uint8 */
    uint256 noStarPrefixes;

    /** @custom:oz-renamed-from a
     ** @custom:oz-retyped-from uint8 */
    uint256 doubleStar;

    /**
     * @custom:oz-renamed-from a
     **/
    uint256 doubleStarClose;

    /** @custom:oz-renamed-from a */ /// @custom:oz-retyped-from uint8
    uint256 lineAfterBlock;

    /// @custom:oz-renamed-from a
    /** @custom:oz-retyped-from uint8 */
    uint256 blockAfterLine;

    /** @custom:oz-renamed-from a */ /** @custom:oz-retyped-from uint8 */
    uint256 twoBlocks;

    /** @custom:oz-renamed-from a *//** @custom:oz-retyped-from uint8 */
    uint256 adjacentBlocks;

    /// ñ 日本 🚀
    /// @custom:oz-renamed-from a
    uint256 unicodeText;

    ///
    uint256 emptyDoc;

    ///
    /// @custom:oz-renamed-from a
    uint256 emptyFirstLine;

    /// @custom:oz-renamed-from a
    /// b
    uint256 valueContinuation;

    /** @custom:oz-renamed-from a
        b */
    uint256 blockContinuation;

    ///@custom:oz-renamed-from a
    uint256 noSpaceAfterSlashes;

    ///    @custom:oz-renamed-from a
    uint256 leadingWhitespace;

    /// @custom:oz-renamed-from a


    uint256 blankLinesBeforeDeclaration;

    uint256 before; /// @custom:oz-renamed-from a
    uint256 trailingDoc;

    uint256 beforeSameLineBlock; /** @custom:oz-renamed-from a */ uint256 sameLineBlock;

    uint256 docBetweenNameAndSemicolon /// @custom:oz-renamed-from a
    ;
    uint256 afterDocBetweenNameAndSemicolon;

    uint256 /// @custom:oz-renamed-from a
    docInsideDeclaration;

    struct S {
        /// @custom:oz-renamed-from a
        /// @custom:oz-retyped-from uint8
        uint256 consecutiveLines;

        /// @custom:oz-renamed-from a

        /// @custom:oz-retyped-from uint8
        uint256 blankLineBetweenLines;

        // The line between the two doc comments below contains only whitespace on purpose
        /// @custom:oz-renamed-from a
        	 
        /// @custom:oz-retyped-from uint8
        uint256 whitespaceLineBetween;

        /// @custom:oz-renamed-from a
        ///
        /// @custom:oz-retyped-from uint8
        uint256 emptyLine;

        /// @custom:oz-renamed-from a
        //// @custom:oz-retyped-from uint8
        uint256 fourSlashesEndRun;

        //// @custom:oz-renamed-from a
        uint256 fourSlashes;

        /// @custom:oz-renamed-from a
        // @custom:oz-retyped-from uint8
        uint256 plainCommentAfter;

        /// @custom:oz-renamed-from a
        // x
        /// @custom:oz-retyped-from uint8
        uint256 plainCommentBetween;

        /// @custom:oz-renamed-from a
        /* @custom:oz-retyped-from uint8 */
        uint256 plainBlockAfter;

        /// @custom:oz-renamed-from a
        /**/
        uint256 emptyBlockAfter;

        /// @custom:oz-renamed-from a
        /***/
        uint256 threeStarsAfter;

        /// @custom:oz-renamed-from a
        /*** @custom:oz-retyped-from uint8 */
        uint256 tripleStarOpen;

        /// @custom:oz-renamed-from a
        /** */
        uint256 blankDocBlockAfter;

        /**
         * @custom:oz-renamed-from a
         *
         * @custom:oz-retyped-from uint8
         */
        uint256 starPrefixes;

        // The middle line of the block below ends with a space on purpose
        /**
         * @custom:oz-renamed-from a
         * 
         * @custom:oz-retyped-from uint8
         */
        uint256 starSpaceLine;

        /** @custom:oz-renamed-from a
            @custom:oz-retyped-from uint8 */
        uint256 noStarPrefixes;

        /** @custom:oz-renamed-from a
         ** @custom:oz-retyped-from uint8 */
        uint256 doubleStar;

        /**
         * @custom:oz-renamed-from a
         **/
        uint256 doubleStarClose;

        /** @custom:oz-renamed-from a */ /// @custom:oz-retyped-from uint8
        uint256 lineAfterBlock;

        /// @custom:oz-renamed-from a
        /** @custom:oz-retyped-from uint8 */
        uint256 blockAfterLine;

        /** @custom:oz-renamed-from a */ /** @custom:oz-retyped-from uint8 */
        uint256 twoBlocks;

        /** @custom:oz-renamed-from a *//** @custom:oz-retyped-from uint8 */
        uint256 adjacentBlocks;

        /// ñ 日本 🚀
        /// @custom:oz-renamed-from a
        uint256 unicodeText;

        ///
        uint256 emptyDoc;

        ///
        /// @custom:oz-renamed-from a
        uint256 emptyFirstLine;

        /// @custom:oz-renamed-from a
        /// b
        uint256 valueContinuation;

        /** @custom:oz-renamed-from a
            b */
        uint256 blockContinuation;

        ///@custom:oz-renamed-from a
        uint256 noSpaceAfterSlashes;

        ///    @custom:oz-renamed-from a
        uint256 leadingWhitespace;

        /// @custom:oz-renamed-from a


        uint256 blankLinesBeforeDeclaration;

        uint256 before; /// @custom:oz-renamed-from a
        uint256 trailingDoc;

        uint256 beforeSameLineBlock; /** @custom:oz-renamed-from a */ uint256 sameLineBlock;

        uint256 docBetweenNameAndSemicolon /// @custom:oz-renamed-from a
        ;
        uint256 afterDocBetweenNameAndSemicolon;

        uint256 /// @custom:oz-renamed-from a
        docInsideDeclaration;
    }

    // Comments in the header of a struct do not document its first member
    struct /* c */ HeaderComments /** @custom:oz-renamed-from a */ {
        uint256 first;
    }

    struct BraceOnNextLine
    {
        /// @custom:oz-renamed-from a
        uint256 first;
    }

    struct OneLine { uint256 first; }

    // A doc comment after the last member documents nothing
    struct DanglingDoc {
        uint256 first; /// @custom:oz-renamed-from a
    }
}
