// SDLC Story main form: show issue-only fields for Issues, and the
// "Approve release" command (opens the pull request of a story awaiting approval).
var CgkSdlc = window.CgkSdlc || {};
CgkSdlc.Story = (function () {
  var ISSUE = 766630001;
  var AWAITING_APPROVAL = 766630104;
  var ISSUE_FIELDS = ['cgk_stepstoreproduce', 'cgk_expectedvsactual'];

  function toggleIssueFields(form) {
    var type = form.getAttribute('cgk_type');
    var show = !!type && type.getValue() === ISSUE;
    ISSUE_FIELDS.forEach(function (name) {
      var c = form.getControl(name);
      if (c) c.setVisible(show);
    });
  }

  return {
    onLoad: function (ctx) { toggleIssueFields(ctx.getFormContext()); },
    onTypeChange: function (ctx) { toggleIssueFields(ctx.getFormContext()); },
    // Command "Approve release". primaryControl = form context.
    approveRelease: function (form) {
      var status = form.getAttribute('statuscode').getValue();
      if (status !== AWAITING_APPROVAL) {
        Xrm.Navigation.openAlertDialog({ title: 'Approve release', text: 'Only stories with status "Awaiting approval" can be approved.' });
        return;
      }
      var pr = form.getAttribute('cgk_pullrequesturl').getValue();
      if (!pr) {
        Xrm.Navigation.openAlertDialog({ title: 'Approve release', text: 'This story has no pull request URL yet.' });
        return;
      }
      Xrm.Navigation.openUrl(pr);
    },
    isAwaitingApproval: function (form) {
      var s = form && form.getAttribute && form.getAttribute('statuscode');
      return !!s && s.getValue() === AWAITING_APPROVAL;
    },
  };
})();
window.CgkSdlc = CgkSdlc;
