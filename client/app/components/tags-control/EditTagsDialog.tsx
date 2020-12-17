import { map, trim, uniq, compact } from "lodash";
import React, { useState, useEffect } from "react";
import Select from "antd/lib/select";
import Modal from "antd/lib/modal";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";

type OwnProps = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
    tags?: string[];
    getAvailableTags: (...args: any[]) => any;
};

type Props = OwnProps & typeof EditTagsDialog.defaultProps;

function EditTagsDialog({ dialog, tags, getAvailableTags }: Props) {
  const [availableTags, setAvailableTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [values, setValues] = useState(() => uniq(map(tags, trim))); // lazy evaluate
  const [selectRef, setSelectRef] = useState(null);

  // Select is initially disabled, so autoFocus prop cannot make it focused.
  // Solution is to pass focus to the select when available tags are loaded and
  // select becomes enabled.
  useEffect(() => {
    if (selectRef && !isLoading) {
      // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
      selectRef.focus();
    }
  }, [selectRef, isLoading]);

  useEffect(() => {
    let isCancelled = false;
    getAvailableTags().then((availableTags: any) => {
      if (!isCancelled) {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string[]' is not assignable to p... Remove this comment to see the full error message
        setAvailableTags(uniq(compact(map(availableTags, trim))));
        setIsLoading(false);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [getAvailableTags]);

  return (
    <Modal
      {...dialog.props}
      onOk={() => dialog.close(values)}
      title="Add/Edit Tags"
      className="shortModal"
      wrapProps={{ "data-test": "EditTagsDialog" }}>
      <Select
        // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
        ref={setSelectRef}
        mode="tags"
        className="w-100"
        placeholder="Add some tags..."
        defaultValue={values}
        onChange={v => setValues(compact(map(v, trim)))}
        disabled={isLoading}
        loading={isLoading}>
        {map(availableTags, tag => (
          // @ts-expect-error ts-migrate(2741) FIXME: Property 'value' is missing in type '{ children: n... Remove this comment to see the full error message
          <Select.Option key={tag}>{tag}</Select.Option>
        ))}
      </Select>
    </Modal>
  );
}

EditTagsDialog.defaultProps = {
  tags: [],
};

export default wrapDialog(EditTagsDialog);
