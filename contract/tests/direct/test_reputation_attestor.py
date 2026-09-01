import pytest

from conftest import warp_to

GEN = 10**18

NOW = "2099-01-01T00:00:00Z"
AFTER_COOLDOWN = "2099-01-01T12:00:01Z"  # 12h cooldown

VALID_GITHUB = "https://github.com/octocat"
VALID_TWITTER = "https://x.com/octocat"
VALID_HACKATHON = "https://devpost.com/octocat"


def mock_full(direct_vm, subject, gh="HIGH", tw="MEDIUM", hk="LOW"):
    proof = str(subject)
    direct_vm.clear_mocks()
    direct_vm.mock_web(
        r".*api\.github\.com/users/.*",
        {"status": 200, "body": f'{{"public_repos":40,"followers":300,"bio":"wallet {proof}"}}'},
    )
    direct_vm.mock_web(
        r"https://x\.com/.*",
        {"status": 200, "body": f"profile page text with follower count -- wallet {proof}"},
    )
    direct_vm.mock_web(
        r"https://devpost\.com/.*",
        {"status": 200, "body": f"won 1st place at ETHGlobal -- built by {proof}"},
    )
    direct_vm.mock_llm(
        r".*scoring independent pieces of public evidence.*",
        f'{{"github_activity_level":"{gh}","github_summary":"active github",'
        f'"twitter_activity_level":"{tw}","twitter_summary":"moderate twitter",'
        f'"hackathon_activity_level":"{hk}","hackathon_summary":"one hackathon win"}}',
    )


def mock_github_down(direct_vm, subject, tw="LOW", hk="LOW"):
    proof = str(subject)
    direct_vm.clear_mocks()
    direct_vm.mock_web(r".*api\.github\.com/users/.*", {"status": 500, "body": ""})
    direct_vm.mock_web(
        r"https://x\.com/.*", {"status": 200, "body": f"profile page text -- wallet {proof}"}
    )
    direct_vm.mock_web(
        r"https://devpost\.com/.*", {"status": 200, "body": f"one small hackathon mention -- {proof}"}
    )
    direct_vm.mock_llm(
        r".*scoring independent pieces of public evidence.*",
        f'{{"github_activity_level":"NONE","github_summary":"",'
        f'"twitter_activity_level":"{tw}","twitter_summary":"low twitter",'
        f'"hackathon_activity_level":"{hk}","hackathon_summary":"small mention"}}',
    )


def register(contract, direct_vm, subject, github=VALID_GITHUB, twitter=VALID_TWITTER, hackathon=VALID_HACKATHON):
    direct_vm.sender = subject
    contract.register_profile(github, twitter, hackathon)


# --- registration ---

def test_register_profile(contract, direct_vm, direct_bob):
    warp_to(direct_vm, NOW)
    register(contract, direct_vm, direct_bob)
    assert contract.is_registered(direct_bob) is True
    links = contract.get_profile_links(direct_bob)
    assert links["github_url"] == VALID_GITHUB
    assert links["registered_at"] == NOW


def test_register_twice_fails(contract, direct_vm, direct_bob):
    register(contract, direct_vm, direct_bob)
    with pytest.raises(Exception):
        register(contract, direct_vm, direct_bob)


def test_register_rejects_non_github_domain(contract, direct_vm, direct_bob):
    with pytest.raises(Exception):
        register(contract, direct_vm, direct_bob, github="https://gitlab.com/octocat")


def test_register_rejects_non_twitter_domain(contract, direct_vm, direct_bob):
    with pytest.raises(Exception):
        register(contract, direct_vm, direct_bob, twitter="https://mastodon.social/@octocat")


def test_register_accepts_www_prefixed_domain(contract, direct_vm, direct_bob):
    register(contract, direct_vm, direct_bob, github="https://www.github.com/octocat")
    assert contract.is_registered(direct_bob) is True


def test_register_rejects_bad_hackathon_url_scheme(contract, direct_vm, direct_bob):
    with pytest.raises(Exception):
        register(contract, direct_vm, direct_bob, hackathon="ftp://devpost.com/octocat")


def test_register_rejects_hackathon_url_with_credentials(contract, direct_vm, direct_bob):
    with pytest.raises(Exception):
        register(contract, direct_vm, direct_bob, hackathon="https://user:pass@devpost.com/x")


def test_register_rejects_localhost_hackathon_url(contract, direct_vm, direct_bob):
    with pytest.raises(Exception):
        register(contract, direct_vm, direct_bob, hackathon="https://localhost/octocat")


def test_register_rejects_loopback_ip_hackathon_url(contract, direct_vm, direct_bob):
    with pytest.raises(Exception):
        register(contract, direct_vm, direct_bob, hackathon="https://127.0.0.1/octocat")


def test_register_rejects_private_ipv4_hackathon_url(contract, direct_vm, direct_bob):
    with pytest.raises(Exception):
        register(contract, direct_vm, direct_bob, hackathon="https://192.168.1.5/octocat")


def test_register_rejects_link_local_metadata_ip_hackathon_url(contract, direct_vm, direct_bob):
    with pytest.raises(Exception):
        register(contract, direct_vm, direct_bob, hackathon="https://169.254.169.254/latest/meta-data")


def test_register_rejects_decimal_ip_literal_hackathon_url(contract, direct_vm, direct_bob):
    # 2130706433 is the decimal form of 127.0.0.1
    with pytest.raises(Exception):
        register(contract, direct_vm, direct_bob, hackathon="https://2130706433/octocat")


def test_register_rejects_internal_suffix_hackathon_url(contract, direct_vm, direct_bob):
    with pytest.raises(Exception):
        register(contract, direct_vm, direct_bob, hackathon="https://service.internal/octocat")


def test_register_rejects_loopback_ipv6_hackathon_url(contract, direct_vm, direct_bob):
    with pytest.raises(Exception):
        register(contract, direct_vm, direct_bob, hackathon="https://[::1]/octocat")


def test_register_rejects_redirector_host_hackathon_url(contract, direct_vm, direct_bob):
    with pytest.raises(Exception):
        register(contract, direct_vm, direct_bob, hackathon="https://bit.ly/abc123")


def test_register_rejects_redirector_host_with_www_prefix(contract, direct_vm, direct_bob):
    with pytest.raises(Exception):
        register(contract, direct_vm, direct_bob, hackathon="https://www.tinyurl.com/abc123")


def test_get_reputation_before_verification_is_zero(contract, direct_vm, direct_bob):
    register(contract, direct_vm, direct_bob)
    rep = contract.get_reputation(direct_bob)
    assert rep["total_score"] == 0
    assert rep["github_status"] == "UNVERIFIED"


def test_get_reputation_unregistered_raises(contract, direct_bob):
    with pytest.raises(Exception):
        contract.get_reputation(direct_bob)


# --- update_evidence ---

def test_update_evidence_unchanged_links_keep_score(contract, direct_vm, direct_bob, direct_carol):
    register(contract, direct_vm, direct_bob)
    warp_to(direct_vm, NOW)
    mock_full(direct_vm, direct_bob)
    direct_vm.sender = direct_carol
    contract.verify_reputation(direct_bob)
    score_before = contract.get_reputation(direct_bob)["total_score"]

    direct_vm.sender = direct_bob
    # Re-submitting the exact same links should not invalidate anything.
    contract.update_evidence(VALID_GITHUB, VALID_TWITTER, VALID_HACKATHON)
    score_after = contract.get_reputation(direct_bob)["total_score"]
    assert score_before == score_after


def test_update_evidence_invalidates_only_the_changed_component(contract, direct_vm, direct_bob, direct_carol):
    register(contract, direct_vm, direct_bob)
    warp_to(direct_vm, NOW)
    mock_full(direct_vm, direct_bob)
    direct_vm.sender = direct_carol
    contract.verify_reputation(direct_bob)
    rep_before = contract.get_reputation(direct_bob)
    assert rep_before["github_score"] > 0
    assert rep_before["hackathon_score"] > 0

    direct_vm.sender = direct_bob
    contract.update_evidence(VALID_GITHUB, VALID_TWITTER, "https://devpost.com/newpage")
    rep_after = contract.get_reputation(direct_bob)
    assert contract.get_profile_links(direct_bob)["hackathon_url"] == "https://devpost.com/newpage"
    # Only the changed component (hackathon) is invalidated -- github/twitter, whose links didn't
    # change, keep their previously-verified score.
    assert rep_after["github_score"] == rep_before["github_score"]
    assert rep_after["twitter_score"] == rep_before["twitter_score"]
    assert rep_after["hackathon_score"] == 0
    assert rep_after["hackathon_status"] == "UNVERIFIED"
    assert rep_after["hackathon_last_verified_at"] == ""


def test_update_evidence_requires_registration(contract, direct_vm, direct_bob):
    direct_vm.sender = direct_bob
    with pytest.raises(Exception):
        contract.update_evidence(VALID_GITHUB, VALID_TWITTER, VALID_HACKATHON)


# --- verification ---

def test_verify_reputation_full_success(contract, direct_vm, direct_bob, direct_carol):
    register(contract, direct_vm, direct_bob)
    warp_to(direct_vm, NOW)
    mock_full(direct_vm, direct_bob, gh="HIGH", tw="MEDIUM", hk="LOW")
    direct_vm.sender = direct_carol
    contract.verify_reputation(direct_bob)
    rep = contract.get_reputation(direct_bob)
    assert rep["github_status"] == "VERIFIED"
    assert rep["twitter_status"] == "VERIFIED"
    assert rep["hackathon_status"] == "VERIFIED"
    # HIGH = max component score
    assert rep["github_score"] == 400
    # MEDIUM = 2/3 of max, floor division
    assert rep["twitter_score"] == 200
    # LOW = 1/3 of max
    assert rep["hackathon_score"] == 100
    assert rep["total_score"] == 700


# --- ownership binding (a wallet must prove it controls the account it points at) ---

def test_verify_does_not_score_unowned_evidence(contract, direct_vm, direct_bob, direct_carol):
    """direct_carol registers evidence links that are perfectly real and fetchable, but never
    proves she controls them (her own wallet address is not present anywhere on the pages) --
    this is exactly the "claim someone else's active GitHub/X/hackathon activity" scenario, and
    it must never produce a score."""
    register(contract, direct_vm, direct_carol, github="https://github.com/famous-dev",
             twitter="https://x.com/famous-dev", hackathon="https://devpost.com/famous-dev")
    warp_to(direct_vm, NOW)
    direct_vm.clear_mocks()
    direct_vm.mock_web(r".*api\.github\.com/users/.*",
                        {"status": 200, "body": '{"public_repos":400,"followers":50000}'})
    direct_vm.mock_web(r"https://x\.com/.*", {"status": 200, "body": "a very famous developer"})
    direct_vm.mock_web(r"https://devpost\.com/.*", {"status": 200, "body": "won every hackathon"})
    direct_vm.mock_llm(
        r".*scoring independent pieces of public evidence.*",
        '{"github_activity_level":"HIGH","github_summary":"very active",'
        '"twitter_activity_level":"HIGH","twitter_summary":"very active",'
        '"hackathon_activity_level":"HIGH","hackathon_summary":"many wins"}',
    )
    contract.verify_reputation(direct_carol)
    rep = contract.get_reputation(direct_carol)
    assert rep["github_status"] == "UNBOUND"
    assert rep["twitter_status"] == "UNBOUND"
    assert rep["hackathon_status"] == "UNBOUND"
    assert rep["github_score"] == 0
    assert rep["twitter_score"] == 0
    assert rep["hackathon_score"] == 0
    assert rep["total_score"] == 0


def test_verify_scores_evidence_once_ownership_is_proven(contract, direct_vm, direct_bob, direct_carol):
    """The same scenario as above, except the fetched pages now contain the subject's own wallet
    address (e.g. added to a bio) -- scoring should proceed normally."""
    register(contract, direct_vm, direct_carol)
    warp_to(direct_vm, NOW)
    mock_full(direct_vm, direct_carol, gh="HIGH")
    contract.verify_reputation(direct_carol)
    rep = contract.get_reputation(direct_carol)
    assert rep["github_status"] == "VERIFIED"
    assert rep["github_score"] == 400


def test_verify_reputation_partial_failure_is_non_destructive(contract, direct_vm, direct_bob, direct_carol):
    register(contract, direct_vm, direct_bob)
    warp_to(direct_vm, NOW)
    mock_full(direct_vm, direct_bob, gh="HIGH", tw="MEDIUM", hk="LOW")
    direct_vm.sender = direct_carol
    contract.verify_reputation(direct_bob)
    prior_github_score = contract.get_reputation(direct_bob)["github_score"]
    prior_github_ts = contract.get_reputation(direct_bob)["github_last_verified_at"]

    warp_to(direct_vm, AFTER_COOLDOWN)
    mock_github_down(direct_vm, direct_bob, tw="HIGH", hk="LOW")
    contract.verify_reputation(direct_bob)
    rep = contract.get_reputation(direct_bob)
    # github untouched by the failed fetch this round
    assert rep["github_score"] == prior_github_score
    assert rep["github_last_verified_at"] == prior_github_ts
    # twitter did update this round
    assert rep["twitter_score"] == 300


def test_verify_reputation_requires_cooldown(contract, direct_vm, direct_bob, direct_carol):
    register(contract, direct_vm, direct_bob)
    warp_to(direct_vm, NOW)
    mock_full(direct_vm, direct_bob)
    direct_vm.sender = direct_carol
    contract.verify_reputation(direct_bob)
    with pytest.raises(Exception):
        contract.verify_reputation(direct_bob)


def test_verify_reputation_after_cooldown_succeeds(contract, direct_vm, direct_bob, direct_carol):
    register(contract, direct_vm, direct_bob)
    warp_to(direct_vm, NOW)
    mock_full(direct_vm, direct_bob)
    direct_vm.sender = direct_carol
    contract.verify_reputation(direct_bob)
    warp_to(direct_vm, AFTER_COOLDOWN)
    mock_full(direct_vm, direct_bob, gh="MEDIUM")
    contract.verify_reputation(direct_bob)
    rep = contract.get_reputation(direct_bob)
    assert int(rep["verification_attempts"]) == 2
    assert rep["github_score"] == 200


def test_verify_unregistered_subject_fails(contract, direct_bob):
    with pytest.raises(Exception):
        contract.verify_reputation(direct_bob)


def test_verify_pays_keeper_reward_when_pool_funded(contract, direct_vm, direct_bob, direct_carol):
    register(contract, direct_vm, direct_bob)
    direct_vm.sender = direct_carol
    direct_vm.value = 10 * 10**15
    contract.fund_rewards()
    direct_vm.value = 0
    warp_to(direct_vm, NOW)
    mock_full(direct_vm, direct_bob)
    contract.verify_reputation(direct_bob)
    assert int(contract.get_reward_pool()) == 10 * 10**15 - 5 * 10**14


def test_verify_succeeds_with_empty_reward_pool(contract, direct_vm, direct_bob, direct_carol):
    register(contract, direct_vm, direct_bob)
    warp_to(direct_vm, NOW)
    mock_full(direct_vm, direct_bob)
    direct_vm.sender = direct_carol
    contract.verify_reputation(direct_bob)  # should not raise despite empty pool
    assert int(contract.get_reward_pool()) == 0


def test_fund_rewards_rejects_zero(contract, direct_vm, direct_bob):
    direct_vm.sender = direct_bob
    direct_vm.value = 0
    with pytest.raises(Exception):
        contract.fund_rewards()


def test_out_of_enum_activity_level_defaults_to_none(contract, direct_vm, direct_bob, direct_carol):
    register(contract, direct_vm, direct_bob)
    warp_to(direct_vm, NOW)
    proof = str(direct_bob)
    direct_vm.clear_mocks()
    direct_vm.mock_web(r".*api\.github\.com/users/.*", {"status": 200, "body": f'{{"bio":"{proof}"}}'})
    direct_vm.mock_web(r"https://x\.com/.*", {"status": 200, "body": f"text {proof}"})
    direct_vm.mock_web(r"https://devpost\.com/.*", {"status": 200, "body": f"text {proof}"})
    direct_vm.mock_llm(
        r".*scoring independent pieces of public evidence.*",
        '{"github_activity_level":"EXTREME","github_summary":"x",'
        '"twitter_activity_level":"MEDIUM","twitter_summary":"y",'
        '"hackathon_activity_level":"LOW","hackathon_summary":"z"}',
    )
    direct_vm.sender = direct_carol
    contract.verify_reputation(direct_bob)
    rep = contract.get_reputation(direct_bob)
    # Ownership was proven (bound), but "EXTREME" is not a recognized activity level, so it
    # defaults to NONE / score 0 -- this is distinct from the UNBOUND (unproven-ownership) path.
    assert rep["github_status"] == "VERIFIED"
    assert rep["github_score"] == 0


# --- blacklist ---

def test_blacklist_zeroes_total_score_reading(contract, direct_vm, direct_alice, direct_bob, direct_carol):
    register(contract, direct_vm, direct_bob)
    warp_to(direct_vm, NOW)
    mock_full(direct_vm, direct_bob)
    direct_vm.sender = direct_carol
    contract.verify_reputation(direct_bob)
    assert contract.get_reputation(direct_bob)["total_score"] > 0

    direct_vm.sender = direct_alice
    contract.blacklist_profile(direct_bob, "Evidence of sybil behavior")
    rep = contract.get_reputation(direct_bob)
    assert rep["total_score"] == 0
    assert rep["blacklisted"] is True


def test_non_admin_cannot_blacklist(contract, direct_vm, direct_bob, direct_carol):
    register(contract, direct_vm, direct_bob)
    direct_vm.sender = direct_carol
    with pytest.raises(Exception):
        contract.blacklist_profile(direct_bob, "not admin")


def test_blacklisted_profile_cannot_be_verified(contract, direct_vm, direct_alice, direct_bob, direct_carol):
    register(contract, direct_vm, direct_bob)
    direct_vm.sender = direct_alice
    contract.blacklist_profile(direct_bob, "Evidence of sybil behavior")
    warp_to(direct_vm, NOW)
    mock_full(direct_vm, direct_bob)
    direct_vm.sender = direct_carol
    with pytest.raises(Exception):
        contract.verify_reputation(direct_bob)


def test_unblacklist_restores_score_reading(contract, direct_vm, direct_alice, direct_bob, direct_carol):
    register(contract, direct_vm, direct_bob)
    warp_to(direct_vm, NOW)
    mock_full(direct_vm, direct_bob)
    direct_vm.sender = direct_carol
    contract.verify_reputation(direct_bob)
    score = contract.get_reputation(direct_bob)["total_score"]

    direct_vm.sender = direct_alice
    contract.blacklist_profile(direct_bob, "temp flag")
    contract.unblacklist_profile(direct_bob)
    rep = contract.get_reputation(direct_bob)
    assert rep["blacklisted"] is False
    assert rep["total_score"] == score


# --- listing ---

def test_list_profiles(contract, direct_vm, direct_bob, direct_carol):
    register(contract, direct_vm, direct_bob)
    register(contract, direct_vm, direct_carol, github="https://github.com/carolgh",
             twitter="https://twitter.com/carolgh", hackathon="https://devpost.com/carolgh")
    listed = contract.list_profiles(0, 10)
    assert len(listed) == 2
