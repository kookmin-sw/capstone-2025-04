// BOJ - 10816 숫자 카드 2

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
 
using namespace std;

ll n, m;
map<ll, ll> cnt;
vector<ll> arr;
ll get_count(ll k) {
    ll s = 0, e = n - 1;
    while(s <= e) {
        ll m = (s + e) / 2;
        if(arr[m] == k) return cnt[arr[m]];
        else if(arr[m] > k) e = m - 1;
        else s = m + 1;
    }
    return 0;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> n;
    loop(i, 1, n) {
        ll k; cin >> k; arr.push_back(k);
        cnt[k]++;
    }
    sort(arr.begin(), arr.end());

    cin >> m;
    loop(i, 1, m) {
        ll k; cin >> k;
        cout << get_count(k) << ' ';
    }
    cout << '\n';
}