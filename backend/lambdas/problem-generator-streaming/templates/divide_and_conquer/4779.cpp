// BOJ - 4779 칸토어 집합

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
ll powll(ll n, ll k) {
    if(!k) return 1;
    if(k & 1) return n * powll(n, k - 1);
    ll m = powll(n, k / 2);
    return m * m;
}
void tc(ll n) {
    if(n == 0) { cout << '-'; return; }
    tc(n - 1);
    loop(i, 1, powll(3, n - 1)) cout << ' ';
    tc(n - 1);
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    while(1) {
        ll n; cin >> n;
        if(cin.eof()) break;
        tc(n); cout << '\n';
    }
}